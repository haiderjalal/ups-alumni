# UPS Alumni Network — Next.js Master Build Prompt

Prepared for Haider Jalal · 19 October 2026

## Research notes and decisions

- The University of Malakand's official page is titled **University Public School and College** and describes the constituent school and college on its Chakdara campus. This platform is for **University Public School (UPS) school alumni**, with matriculation year as the primary batch identifier. It must not silently become a directory of all University of Malakand graduates.
- Official institutional background: https://www.uom.edu.pk/links/university-public-school-and-college/details
- The university page references this university logo asset: https://www.uom.edu.pk/assets/frontend/images/UOMlogo.png. It is a **University of Malakand logo candidate, not a verified separate UPS crest**. Its current header also uses a `25th.png` asset; do not use that time-specific asset as the permanent alumni identity. A distinct UPS crest was not verified in this research.
- Feature references: Hivebrite emphasizes directories, groups, events, mentoring and careers; Graduway emphasizes community connection, mentoring and communication. These inform the feature selection below, rather than a claim that one vendor is universally best.
- References: https://hivebrite.io/alumni-management-software/ and https://gravyty.com/graduway/
- **Working assumption:** Rs. 500 is a one-time registration fee, with no recurring renewal. It comes from the project brief, not the university's website. The school must supply real receiving-account details and operating policies before live collections.
- The emerald, cream and gold palette below is a **proposed alumni website design**, not a verified official school brand standard.

---

## Copy everything below into your coding agent

You are a senior full-stack Next.js engineer, product designer and QA engineer. Build a complete, polished alumni networking platform for **University Public School (UPS), Chakdara, University of Malakand, Pakistan**.

Implement the application in the repository. Deliver working routes, persistent data, secure authentication, registration, fee verification, alumni discovery, community features and an admin portal. Do not stop at a plan, landing page, UI mockup or component collection. Work through the implementation in stages, verifying each stage, until the requested system is complete. If an external credential is unavailable, finish the surrounding implementation, provide a documented adapter and identify that specific live integration as unconfigured.

### 1. Product identity and factual boundaries

Product name: **UPS Alumni Network**.

School display name: **University Public School**.

Context line: **Chakdara · University of Malakand**.

Primary audience: former UPS students across matric batches such as 2017 and 2018, living in Pakistan and abroad. Support employed alumni, entrepreneurs, business owners, freelancers, students, job seekers and retired alumni. Allow employment and business ownership to coexist.

Use this official background source for factual institutional content:
https://www.uom.edu.pk/links/university-public-school-and-college/details

Write concise original school background copy based only on verified facts. Do not invent the school's founding year, principal, patron, committee, awards, alumni counts, official alumni-association status, quotations, contact numbers, email addresses or postal address. The university's founding date must not become the school's founding date.

The platform is being initiated by alumni. Default its governance label to **Alumni-led community**. Make institutional endorsement a separate admin configuration; use an official designation only when the operator supplies it. School enrollment verification should be labeled **Alumni status verified by the platform**, rather than claiming government or university certification.

Logo handling:
- Inspect the verified source and the university logo candidate at https://www.uom.edu.pk/assets/frontend/images/UOMlogo.png.
- Do not relabel the university seal as the UPS crest. Do not generate or redraw an official emblem.
- Begin with an elegant typographic UPS Alumni Network wordmark. Allow an administrator to upload an approved UPS logo and, separately, an approved university affiliation logo.
- Keep official-logo publishing disabled until an administrator confirms the appropriate asset and approval. Store approved assets locally or in managed storage, with provenance and alt text. Avoid production hotlinks and third-party logo aggregators.
- Keep a separate ASSET_SOURCES.md recording source URL, asset identity, permission/approval state and use.

### 2. Technology and architecture

Use the current stable, mutually compatible releases of:
- Next.js with App Router, React and TypeScript in strict mode.
- Tailwind CSS, accessible shadcn/ui components and Lucide icons.
- PostgreSQL with Prisma ORM, migrations and a reproducible development seed.
- Better Auth with its supported Prisma adapter, email/password sign-in, email verification, secure sessions and password reset. Use documented library APIs rather than implementing password security yourself.
- Zod validation shared between server and forms; React Hook Form for complex client forms.
- Private S3-compatible object storage for sensitive documents, with a storage abstraction. Public approved photos use a separate storage policy.
- A transactional email abstraction with a real SMTP/provider adapter and a development-only local delivery sink.
- Vitest or equivalent for business rules and Playwright for critical user journeys.

Check official documentation before implementation and pin the selected package versions in the lockfile. Choose stable Prisma and matching auth-adapter versions explicitly; do not accidentally install an incompatible prerelease. Useful entry points:
https://nextjs.org/docs/app/getting-started/installation
https://better-auth.com/docs/introduction
https://www.prisma.io/docs/orm

Use Server Components for data-driven pages and Client Components where interaction needs them. Centralize authorization and data access. Use Server Actions or Route Handlers with server-side validation, permission checks and consistent typed error responses. Keep database and object-storage credentials on the server. Design for a standard Node.js deployment, with local PostgreSQL and local object storage available through Docker Compose.

Persist all real records in PostgreSQL. Do not use localStorage as the membership database. An optional explicitly labeled preview mode may use synthetic data, but must be isolated from production and must never show fake payments or fake approvals as real.

### 3. Visual direction

Design a premium school alumni community with an editorial, welcoming aesthetic: refined typography, generous spacing, authentic photography and a strong sense of belonging. It should be appealing to both recent graduates and older batches.

Proposed design tokens, subject to later approved school branding:
- Primary deep emerald: #123E35.
- Dark forest: #082C25.
- Warm ivory background: #F8F6EF.
- White surface: #FFFFFF.
- Gold accent: #B78A42; use darker tones when needed for text contrast.
- Main text: #182A25.
- Muted text: #5E6D66.
- Border: #DFE5DC.
- Display typography: a self-hosted readable serif such as Cormorant Garamond, with sensible fallbacks.
- Interface/body typography: a self-hosted clean sans serif such as Manrope.

Use a controlled type scale, approximately 56–76px desktop hero headings, 36–48px section headings and 16–18px body text. Adapt comfortably to small screens. Use a maximum content width around 1200–1280px, an 8px spacing rhythm, restrained 12–20px corner radii, fine borders and subtle shadows. Gold is an accent, not a low-contrast body-text color.

The homepage should have a strong photograph-led composition with an asymmetric editorial layout. Avoid giant gradient blobs, glass panels, excessive pills, decorative dashboards and repeated identical card grids. Give the directory, batch pages, event listings and stories distinct layouts within one consistent system.

Use real, approved school/campus/reunion photography when supplied. Do not label unrelated stock campuses or people as UPS. Until then, use tasteful original nonrepresentational artwork and clear photo placeholders, without broken images. Obtain consent before publishing identifiable alumni photos.

Use restrained hover feedback and 150–250ms transitions. Respect reduced-motion settings. Build light mode first. Desktop member screens use a compact sidebar and clear top bar; mobile uses a drawer and a small set of primary navigation destinations. All routes must work at 360px width without horizontal overflow.

### 4. Public website and copy

Build these public routes:
- `/`: homepage.
- `/about`: school background and community purpose.
- `/membership`: benefits, eligibility, Rs. 500 fee and process.
- `/events` and `/events/[slug]`: published public events only.
- `/stories` and `/stories/[slug]`: approved public stories only.
- `/contact`, `/faq`, `/privacy`, `/terms` and `/refund-policy`.
- `/register`, `/login`, `/verify-email`, `/forgot-password` and `/reset-password`.

Homepage content and order:
1. Elegant navbar with wordmark, About, Membership, Events, Stories, Sign in and Join the Network.
2. Hero headline: **Different batches. Shared beginnings.** Supporting copy: **Reconnect with your UPS classmates, discover alumni across professions, and create new opportunities together.** Primary CTA: **Join for Rs. 500**. Secondary CTA: **Explore the Community**, linking to a public overview rather than exposing the member directory.
3. A brief school/community introduction grounded in the verified background.
4. An interactive batch-discovery section with examples such as 2017 and 2018. Public visitors see general batch information and a sign-in invitation; member details remain private.
5. Benefits: classmates, professional connections, alumni businesses, jobs and mentorship, reunions and giving back.
6. Approved alumni spotlights and upcoming published events. Hide empty sections or show honest invitation copy.
7. A four-step registration explanation: create an account, complete your alumni profile, pay Rs. 500, receive verification and approval.
8. A simple fee panel and FAQ.
9. A final community invitation and footer with governance label and policy links.

Do not invent testimonials or public membership metrics. Compute statistics from approved real data; in a new installation use **Be part of the founding community**. Do not publish seeded demonstration members as actual UPS alumni. Contact details and committee information are admin-managed and initially empty.

### 5. Registration and onboarding

Build a mobile-friendly, resumable stepper with autosave to the authenticated user's server-side draft. Show progress, inline validation, clear required fields and a review screen. New users can create an account and save progress; require email verification before final submission and payment.

Step A — Account and personal information:
- Full name and verified email are required.
- Password, confirmation and acceptance of terms/privacy notice are required.
- Phone/WhatsApp is optional, normalized to international format; make +92 convenient without excluding overseas numbers.
- Current city and country are required; hometown is optional.
- Profile photograph, short bio and pronouns are optional.
- Do not request CNIC, home address, salary or date of birth by default.

Step B — School information:
- Required matric batch: label **Matric completion year**, helper **For example, 2018 means the year you completed Class 10.**
- Optional school joining/leaving years, section/house if the school used them, and school roll number.
- Batch choices come from an admin-maintained catalog. Include **My batch is not listed** with a manual-review request; do not derive the school's earliest batch from the university's founding date.
- An optional school-memory field can help verification, but must never be treated as conclusive identity proof.
- Do not require uploading a matric certificate for every member. If additional evidence is requested, provide a private, limited-retention upload and explain how to redact unrelated information.

Step C — Occupation and professional profile:
- Required current professional status, with multiple selections where appropriate: employed, business owner, self-employed/freelancer, student, seeking opportunities, retired, other.
- Employed: job title, organization, industry and optional company URL.
- Business owner: business name, sector, services/products, city and optional website/business contact. Business-directory publication is a separate opt-in.
- Freelancer: expertise, offered services and optional portfolio.
- Student: institution, course/field and optional expected completion year.
- Job seeker: desired roles and skills; current employer must not be mandatory.
- Optional LinkedIn URL, skills, interests and further education entries.
- Optional flags: available to mentor, seeking mentorship, hiring, open to collaboration and volunteering.

Step D — Visibility and preferences:
- Directory discoverability choice, with a clear explanation; no public exposure by default.
- Phone and email are private by default, with separate settings for self/admin only, accepted connections or approved members.
- Separate newsletter opt-in and communication preferences from mandatory transactional messages.
- Show exactly which profile fields approved members will see.

Step E — Review, payment and status:
- Show the complete editable application and Rs. 500 fee breakdown.
- Require confirmation that the applicant attended UPS and that information is accurate.
- Save the application and create a payment order server-side.
- Display a timeline for email verification, application submission, payment review and alumni review.
- Explain that payment confirmation and alumni approval are separate processes. Do not promise a fixed turnaround without an admin-configured service commitment.

### 6. Rs. 500 registration fee and payment integrity

Default to a **one-time PKR 500 registration fee**, with no recurring subscription. Make future fee changes admin-configurable, while preserving the amount quoted on existing orders. Store money as integer minor units: PKR 500 = 50,000 paisa. Display **Rs. 500** consistently.

Implement manual payment collection for launch, supporting operator-configured bank transfer, Easypaisa transfer and JazzCash transfer instructions. These are manual transfer options, not claims of a live gateway integration.

If receiving-account information is missing, show a clear setup state and disable live payment submission. Never invent account numbers, wallet numbers, IBANs, account titles or QR codes. A QR code, if used, must encode verified configured payment information.

Manual workflow:
1. Create an immutable registration order with amount, currency, member, reference and selected receiving account.
2. Display account title, account identifier, instructions and the order reference.
3. Collect the external transaction reference, payment date, payer name if needed, amount paid and private receipt upload.
4. Mark the attempt **submitted for review**, never **paid**, merely because a receipt was uploaded.
5. An authorized finance reviewer reconciles against the actual receiving-account statement, then approves or rejects with a reason.
6. On confirmation, create an immutable payment record and issue a downloadable receipt. Label it a payment receipt, not a tax invoice unless the operator supplies valid invoicing details.

Use separate order, payment-attempt, confirmed-payment and refund records. Support unpaid, awaiting review, confirmed, rejected and refunded states with permitted transitions. Rejected evidence can be resubmitted without losing prior attempts. Detect duplicate transfer references within the appropriate provider/receiving-account scope. Keep approvals transactional and idempotent so retries or simultaneous reviews cannot create duplicate payments or memberships.

Provide a payment-provider interface for later hosted-checkout integrations. Enable a real gateway only after checking its official merchant documentation and receiving valid merchant credentials. Gateway confirmation must validate signature, amount, currency, order association and replay protection server-side. Never trust a browser success redirect. Do not collect card numbers, wallet PINs or OTPs.

If an application is rejected after payment, route it to a visible finance/refund review queue. Track requested, approved, processed and failed refund outcomes with transaction evidence. Do not claim that a manual refund has been issued until a finance reviewer records its completion. Keep the refund policy configurable and require operator completion before live collection. Donations and paid event tickets must remain separate from the registration fee.

### 7. Membership access and verification

Maintain separate states for:
- Email verification.
- Application: draft, submitted, under review, changes requested, approved or rejected.
- Payment/order settlement and any refund.
- Membership: pending, active, suspended or closed.

Activate membership only when email is verified, required application fields are valid, alumni application is approved and the registration fee is confirmed. Enforce this rule server-side. An approval or receipt alone must not grant directory access.

Pending users can view/edit allowed application fields, submit payment evidence, see status, read public content and contact support. They cannot access private profiles, messages, group discussions or other members' data.

Do not silently move an active member to a different batch after an identity-sensitive edit; re-review batch and school identity changes. Profile edits to ordinary occupation fields can update immediately. Suspension must revoke access promptly across existing sessions. Define and document membership consequences of a full fee refund rather than leaving a contradictory active/refunded state.

### 8. Member area

Build `/app` with a welcoming dashboard showing profile completion, personal status, batch activity, relevant events, connection requests and notifications. Add a digital membership card with a nonsequential public identifier. A QR verification page, if included, reveals only a minimal validity response and no private profile or financial information.

**Alumni directory — `/app/directory`**
- Search by name, matric batch, city/country, industry, company, skills and professional status; include mentor/hiring flags.
- Composable filters in shareable member-only URL state, pagination, sorting, clear reset and useful empty states.
- Cards show only allowed fields: photo/initials, name, batch, headline and city.
- Detailed profiles show consented bio, experience, education, skills and connection actions.
- Respect discoverability settings in direct profile links, search, counts and API responses. Do not expose hidden fields in HTML payloads, metadata or downloads.

**Batches — `/app/batches` and `/app/batches/[year]`**
- Automatically associate approved members with their approved matric year.
- Batch members, posts, memories, reunion events and an optional administrator-appointed representative.
- Membership counts come from authorized, discoverable data; a profile hidden from the directory stays hidden in batch lists.

**Connections and messaging — `/app/connections`, `/app/messages`**
- Request, accept, decline, withdraw and remove connections; prevent duplicate or self-connections.
- Database-backed one-to-one conversations after mutual connection/consent, with unread indicators and cursor pagination.
- Polling is acceptable initially; do not require an always-on WebSocket server.
- Provide block and report. Blocking applies to requests, messages and notifications. No unsolicited bulk messaging.
- Conversation content is available only to participants; provide narrowly scoped access to reported content for authorized moderation, with audit logging.

**Alumni business directory — `/app/businesses`**
- Separate business records linked to owners, supporting multiple owners where approved.
- Sector/location filters, description, logo, products/services, website and opt-in business contact details.
- Owner editing, admin review, report listing and collaboration/contact requests. Profile consent does not automatically publish business contact information.

**Jobs and opportunities — `/app/opportunities`**
- Jobs, internships, freelance projects and volunteer roles.
- Title, organization, category, location/remote type, description, application URL, deadline and posting alumnus.
- Search, save, submit, edit and admin approval; expire outdated posts automatically.
- Default to applications via a validated external URL; do not require storing CVs for launch.

**Mentorship — `/app/mentorship`**
- Mentor opt-in, expertise, topics, languages, availability and capacity.
- Search mentors; send a request with a goal and preferred format; accept/decline and track active/completed/cancelled relationships.
- Recommend matches using transparent skill/industry criteria; no AI matching requirement.
- No calendar/video integration should be presented as working unless configured.

**Events — `/app/events`**
- Reunions, networking sessions, school visits and online sessions.
- Public/member/batch visibility; time zone, location or virtual link, capacity, organizer and RSVP deadline.
- Atomic RSVP/cancellation and waitlist promotion, with organizer attendance tools and calendar-file downloads.
- UTC timestamps in storage; Asia/Karachi as the default display zone, with explicit zone labels.
- Free events work at launch. Keep paid ticketing behind a feature flag until a separate payment flow is configured; membership payment must not charge for events implicitly.

**Groups and community — `/app/groups`, `/app/feed`**
- Batch, profession, city/chapter and interest groups, with join/request-to-join controls and scoped moderators.
- Posts, comments, simple reactions, attachments where allowed, and pinned announcements.
- Editing/deleting own content, reporting and moderation. Private-group membership checks apply to every feed query, attachment and notification.
- An admin-curated memories/gallery area with photo consent and removal requests.

**Stories, resources and notifications**
- Alumni stories are editorially reviewed; public publication requires separate explicit consent.
- Resources support admin-managed career guides and school/community documents, with access visibility.
- In-app notifications and transactional email for requests, approvals, payment outcomes and events. Use a durable outbox with deduplication and retry handling.
- Optional newsletters are opt-in and include an unsubscribe mechanism.

**Profile and settings — `/app/profile`, `/app/settings`**
- Edit professional details, visibility, password, notification settings and connections.
- Export one's own data; request account closure/deletion; show policy-defined retention of necessary financial records. Revoked public-sharing consent must remove public profile/story exposure.
- Prepare the UI for future Urdu/Pashto localization and RTL, but launch in polished English unless translated content is supplied.

### 9. Administration and governance

Build a separate `/admin` area with server-enforced roles:
- Super admin: configuration and role management.
- Membership admin: school/alumni verification and member management.
- Finance reviewer: payment reconciliation and refunds.
- Moderator/content editor: reports, posts, events, stories and resources within scope.
- Batch/group representative: only delegated batch/group tools, never global personal data or payment evidence.

One staff account may hold multiple roles. Require MFA for privileged roles in production. Bootstrap the first administrator through a secure CLI or one-time protected process; never permit self-assigned admin registration or hardcoded production passwords.

Provide:
- Overview: active members, pending applications, pending payments, confirmed fee revenue, refunds and engagement. Label definitions; revenue excludes pending/rejected attempts.
- Search/filter applications by batch, date, occupation, location and review state.
- Application review with approve, reject, request changes and private review notes. Restrict school evidence and payment evidence to relevant staff.
- Payment review with recorded reconciliation reference and an auditable reason for decisions.
- Content, business, job, mentorship and event management; report triage, suspension and appeals/support handling.
- Admin-managed batch catalog, professional categories and group representatives.
- CMS for homepage copy, approved logos, school information, contact details, FAQs and policies. Use draft/preview/publish rather than publishing incomplete content.
- Membership fee and receiving-account configuration, feature flags and operational settings.
- CSV import with preview, validation, duplicate handling and an import summary. Imported records remain invited/unclaimed and unverified until legitimately claimed; never mark them paid automatically.
- Role-limited CSV exports, protecting private fields and neutralizing spreadsheet formula injection.
- Append-only audit records for role changes, reviews, payment/refund decisions, exports, suspensions and critical settings. Avoid copying private documents or full messages into audit logs.

### 10. Data model and invariants

Design normalized models covering:
User, AuthAccount, Session, VerificationToken, RoleAssignment; AlumniProfile, ContactVisibility, ProfessionalExperience, Education, Skill, ProfileSkill; Batch, BatchChangeRequest, AlumniApplication, ApplicationReview, Membership; RegistrationOrder, PaymentAttempt, ConfirmedPayment, Refund; ConnectionRequest, Connection, Block, Conversation, ConversationParticipant, Message; Business, BusinessOwner; Opportunity, SavedOpportunity; MentorProfile, MentorshipRequest, Mentorship; Group, GroupMembership, Post, Comment, Reaction; Event, EventRegistration, WaitlistEntry, Attendance; Story, Resource, MediaAsset, ConsentRecord; Notification, EmailOutbox, Report, SupportRequest, AuditLog, SiteSetting.

Adjust model boundaries when it improves implementation, while preserving all required behavior. Add foreign keys, indexes and unique constraints, including unique normalized email, unique membership identity, unique connection-pair handling, one RSVP per event/member and payment idempotency keys. Keep auth-library tables compatible with the selected library version.

Use transactions for financial confirmation, membership activation, event-capacity allocation and connection acceptance. Add created/updated timestamps, moderation state and record ownership where needed. Protect append-only financial history; corrections use linked reversal/refund records rather than overwriting the original settlement. Document money and state-machine rules in the codebase.

### 11. Security, privacy and operational behavior

- Deny access by default. Enforce authentication, active membership, ownership, visibility and role scope at the server/data-access boundary for every read and write.
- Client-hidden buttons and route middleware are not sufficient authorization.
- Apply CSRF protections appropriate to the auth and mutation framework, safe cookie settings, session revocation and rate limits for login, reset, registration, messaging and uploads.
- Never include private member data in public search indexes, Open Graph previews, sitemap entries or shared caches. Private pages should be noindex; configure caching to prevent cross-user data leakage.
- Treat uploads as untrusted. Validate file signatures, types and size, generate storage keys and strip unnecessary metadata from publicly shared photos. Keep payment and school documents private with short-lived authorized URLs. Disallow executable HTML/SVG uploads unless safely sanitized by a dedicated pipeline.
- Sanitize user-generated rich text, validate external URLs and use safe link attributes.
- Bound queries, paginate lists, rate-limit exports and prevent arbitrary server-side URL fetching.
- Store secrets in environment variables. Redact sensitive logs and never expose authentication tokens, receipt URLs or private profile fields in analytics.
- Implement structured error logging, backup/restore instructions, a health endpoint and a reliable scheduled worker for email retries, expiry and reminders. Document how to run scheduled work on the chosen host.
- Configure document retention, deletion and refund policies explicitly. Avoid unsupported claims of legal compliance or official accreditation.
- Provide a clear operator setup checklist for policies, fee details, receiving accounts, email, approved assets and backups before production collections are enabled.

### 12. Accessibility and performance

Use semantic HTML, accessible form labels, keyboard navigation, focus management, visible focus rings, announced validation errors, descriptive alt text and contrast meeting WCAG AA targets. Stepper state and modal interactions must work with assistive technology. Preserve entered data after recoverable errors.

Optimize images with appropriate sizes and formats. Reserve image dimensions to avoid layout shift. Keep public pages fast on typical Pakistani mobile connections, use minimal client JavaScript and avoid heavy map/animation libraries in the main bundle. Prefer city-based filters to precise-location maps. Add loading, empty, success, error and permission-denied states throughout.

### 13. Delivery stages and acceptance checks

Implement in this order, continuing until all requested launch modules are complete:
1. Design tokens, route structure, public website and configuration/CMS foundation.
2. Database, authentication, resumable registration and separate application/payment/membership state machines.
3. Manual fee submission, finance review, alumni approval, receipts and active-member gating.
4. Member dashboard, profiles, directory, batches and admin workflows.
5. Connections/messages, businesses, opportunities, mentorship, groups/feed and free events.
6. Stories/resources, consent/privacy settings, notifications, moderation and hardening.
7. End-to-end verification, deployment documentation and final polish.

Create realistic synthetic development data across multiple batches, professions and cities, clearly marked as demonstration records and excluded from production. Use example.com addresses and no real scraped alumni information. Do not seed live credentials.

Test at least these meaningful scenarios:
- A new user verifies email, resumes onboarding, submits an application and uploads payment evidence.
- Receipt upload does not activate membership. Payment approval without alumni approval does not activate membership; both approvals and email verification do.
- Rejected evidence can be corrected without paying twice; simultaneous/repeated confirmation remains idempotent.
- A pending, rejected or suspended account cannot obtain member data through direct URLs, API requests or cached responses.
- Hidden email/phone fields never appear in another member's serialized response, metadata, search or export.
- Identity-sensitive batch edits receive review and cannot silently change membership identity.
- Directory filters, profile editing and consent changes persist correctly.
- Connections require consent, nonparticipants cannot read conversations, and blocking stops new contact.
- Private group posts and attachments cannot be read by nonmembers.
- Event RSVP capacity and waitlists remain correct under concurrent requests.
- Role escalation attempts fail; finance reviewers and group representatives stay within scope.
- Refund outcomes, net revenue and membership state remain consistent.
- Mobile registration and primary navigation work at 360px; keyboard-only onboarding works.

Run type checking, linting, relevant tests and a production build. Report actual commands and outcomes; never claim a check passed without running it. If an external integration cannot be live-tested, document that limitation precisely while exercising its local adapter and surrounding flow.

Deliver:
- A complete Next.js repository with all required routes and working UI interactions.
- Database schema/migrations, local services and a repeatable synthetic seed.
- `.env.example` with every required variable described, without secrets.
- README with install, local run, database migration, admin bootstrap, worker, storage/email configuration and deployment steps.
- ASSET_SOURCES.md, application/payment state documentation and an access-control matrix.
- A concise production setup checklist and a clear list of any unconfigured external integrations.

Final quality bar: the platform should look distinctive and professionally designed, while allowing a genuine UPS alumnus to move from registration through a verified Rs. 500 payment and alumni review into a useful, private alumni community. Every visible action must work or clearly explain its configured limitation. Begin implementation now.
