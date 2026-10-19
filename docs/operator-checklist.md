# Production setup checklist

Complete every item before enabling live registration fees. Items marked **Gap** are part of the
spec but are not built in this version.

## 1. Environment and secrets

- [ ] `NODE_ENV=production`, `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` set to the HTTPS origin.
- [ ] `BETTER_AUTH_SECRET` is a random value of at least 32 characters, stored in the host's secret store.
- [ ] `DATABASE_URL` points to a managed PostgreSQL instance with TLS. Do not reuse development credentials.
- [ ] `EMAIL_DRIVER=smtp` with a real provider. Production refuses the development sink.
- [ ] `STORAGE_DRIVER=supabase` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and a bucket that is **private** (not public). Production refuses local storage.
- [ ] No `.env` file, seed password, or bootstrap password is present on the server.

## 2. Database

- [ ] `npm run db:deploy` has been run against production, and `npx prisma migrate status` is clean.
- [ ] The partial unique indexes and append-only triggers from the initial migration exist (check `\d payment_attempts` and `confirmed_payments`).
- [ ] Automated daily backups and a tested restore (see `docs/operations.md`).
- [ ] The seed has **not** been run against production.

## 3. Policies and school information

- [ ] The school has reviewed and published the privacy notice, terms of use and refund policy in `/admin/content`. Until then each page says it is a draft.
- [ ] Contact details (email, phone, address, response times) are entered and published, or the contact page keeps its honest empty state.
- [ ] The FAQ has been reviewed.
- [ ] Review timelines have been decided. The platform does not promise a turnaround.
- [ ] Institutional endorsement wording is set only if the school confirms it. The default label is **Alumni-led community**.

## 4. Fees and receiving accounts

- [ ] The registration fee in `/admin/settings` is confirmed (launch default: Rs. 500, one-time).
- [ ] Each receiving account (bank, Easypaisa, JazzCash) is entered with the **verified** title and number, then activated. Never enter numbers you have not checked against the account.
- [ ] Finance reviewers are named, with the FINANCE_REVIEWER role, and know the statement-matching procedure.
- [ ] The refund procedure is agreed, including who records transfers as processed.

## 5. Staff and access

- [ ] The first super administrator is created with `npm run admin:bootstrap`, and the password is cleared from the shell history.
- [ ] Roles are granted narrowly: membership administrators, finance reviewers, content moderators, and scoped batch or group representatives.
- [ ] **Gap:** multi-factor authentication for privileged roles is not built. Until it is, restrict staff accounts to strong, unique passphrases and review `/admin/audit` weekly.

## 6. Assets and branding

- [ ] Approved photography has written consent from everyone identifiable in it, and is recorded in `ASSET_SOURCES.md`.
- [ ] Any official logo has been approved by the school and recorded in `ASSET_SOURCES.md`. The university seal is not used as the UPS crest.
- [ ] **Gap:** the admin logo upload and EXIF stripping for public photos are not built. Use only images that have already been cleaned.

## 7. Operations

- [ ] Web server and worker processes run under a supervisor, with restart on failure.
- [ ] `/api/health` is monitored with an alert on 503.
- [ ] Logs are shipped to the log platform and reviewed for `level: "error"` events.
- [ ] Outbox FAILED rows are checked daily (see `docs/operations.md`).

## 8. Known gaps in this version

These are part of the brief but are not built yet. Do not describe them as available.

- Profile photo upload and public photo storage (the storage layer and authorization exist).
- Stories submission, editorial review and publication (the public listing exists).
- Member resources library and admin resource management.
- Admin pages for event creation and editing, business review, opportunity review and mentor approval (the service functions exist).
- CSV import with preview, and role-limited CSV export.
- Admin logo approval workflow.
- Multi-factor authentication for staff.
- A content security policy with per-request nonces.
- Payment gateway integration (the manual flow is complete; no gateway adapter exists).
- Urdu and Pashto localization.
- Engagement analytics.
