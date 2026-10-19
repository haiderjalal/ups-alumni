# Access-control matrix

Authorization runs on the server in every page, Server Action and Route Handler. Hiding a button
or a navigation item is never the only control. Helpers: `requireUser`, `requireActiveMember`,
`requireStaffRole` in `src/lib/session.ts`.

## Audiences

| Audience | How it is established |
| --- | --- |
| Visitor | No session |
| Applicant | Signed in; membership PENDING, SUSPENDED or CLOSED |
| Active member | Signed in; `Membership.status = ACTIVE` (checked on each request) |
| Staff | Signed in with at least one unrevoked `RoleAssignment` |

## Routes

| Route | Visitor | Applicant | Active member | Staff |
| --- | --- | --- | --- | --- |
| Public pages, published events and stories, CMS published content | Yes | Yes | Yes | Yes |
| `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password` | Yes | Redirected to `/app` once signed in | Redirected | Redirected |
| `/app/status`, `/app/onboarding/*` (while the application is editable) | Redirected to sign-in | Yes | Redirected to dashboard | — |
| `/app/payment`, own receipt | Redirected | Yes (after submission) | Yes | — |
| `/app/profile`, `/app/settings`, `/app/notifications` | Redirected | Yes | Yes | — |
| `/app` (dashboard), `/app/directory`, `/app/batches` | Redirected | Redirected to status | Yes | — |
| `/app/connections`, `/app/messages` | Redirected | Redirected | Yes; messages only for participants | — |
| `/app/groups`, `/app/feed`, `/app/events` | Redirected | Redirected | Yes; private groups for members only | — |
| `/app/businesses`, `/app/opportunities`, `/app/mentorship` | Redirected | Redirected | Yes | — |
| `/admin/applications`, `/admin/members`, `/admin/batches` | — | — | — | MEMBERSHIP_ADMIN or SUPER_ADMIN |
| `/admin/payments`, `/admin/refunds`, `/admin/settings`, `/admin/audit` | — | — | — | FINANCE_REVIEWER or SUPER_ADMIN (audit also MEMBERSHIP_ADMIN) |
| `/admin/content` | — | — | — | CONTENT_MODERATOR or SUPER_ADMIN |
| `/admin/reports` | — | — | — | CONTENT_MODERATOR or MEMBERSHIP_ADMIN or SUPER_ADMIN |
| `/admin/roles` | — | — | — | SUPER_ADMIN only |
| `/admin` overview | — | — | — | Any staff role; each figure needs its own role |

## Files

| File | Who may read |
| --- | --- |
| Payment receipt | Owner, and FINANCE_REVIEWER or SUPER_ADMIN |
| Profile photo (when built) | Owner; active members when the profile is listed; membership staff |
| Anything else | Owner only, unless a rule above names the reader |

Files are served only through `/api/files/[id]`, which checks access on each request and sends
`Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` and a sandbox policy.

## Privacy rules

- **Directory**: a member appears only when listed (`directoryDiscoverable`) and active. The
  search runs in the database, and blocked pairs are excluded in both directions.
- **Contact details**: email, phone and LinkedIn each have their own visibility (PRIVATE,
  CONNECTIONS, MEMBERS). The rule is `canViewContact` in `features/profile/domain/visibility.ts`.
- **Exports**: `/api/account/export` contains only the requester's own records.
- **Logs**: `log()` redacts keys such as `email`, `phone`, `token`, `receiptUrl` and `transactionReference`.
- **Audit log**: append-only (database trigger). Entries hold identifiers and decisions, not documents or messages.

## Staff role rules

- Only SUPER_ADMIN grants or revokes roles, and nobody changes their own roles.
- The last SUPER_ADMIN cannot be removed.
- BATCH_REPRESENTATIVE and GROUP_REPRESENTATIVE are scoped to one batch or group. They never see
  global personal data or payment evidence.
- Every staff action records the acting roles in the audit log.
