# UPS Alumni Network

An alumni networking platform for **University Public School**, Chakdara · University of Malakand.
Built with Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4 with shadcn/ui,
PostgreSQL with Prisma 7, Better Auth, Zod, and React Hook Form.

Read these first:

- [`UPS_Alumni_Nextjs_Master_Prompt.md`](UPS_Alumni_Nextjs_Master_Prompt.md): the product specification.
- [`docs/state-machines.md`](docs/state-machines.md): the money and membership rules.
- [`docs/access-control.md`](docs/access-control.md): who can reach what.
- [`docs/operations.md`](docs/operations.md): workers, backups, restore.
- [`docs/operator-checklist.md`](docs/operator-checklist.md): what must be true before live collections, and known gaps.
- [`ASSET_SOURCES.md`](ASSET_SOURCES.md): the source and permission state of every asset.

## Requirements

- Node.js 20.9 or later (developed on 24.x) and npm.
- PostgreSQL 16 or later. Use Docker Compose, or the embedded development server described below.
- For private files and email in development: nothing extra (local storage and a file-based mail sink are used).

## Local setup

```bash
npm install                       # also runs `prisma generate`
cp .env.example .env.local        # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
```

Start PostgreSQL, either:

```bash
docker compose up -d postgres            # if Docker is installed
# or, without Docker (development only):
npm run db:local                        # leave this running in its own terminal
```

Then:

```bash
npm run db:migrate          # applies migrations (prisma/migrations)
npm run db:seed             # optional: synthetic members on example.com, prints a demo password once
npm run dev                 # http://localhost:3000
```

Development email is written as JSON files to `.dev-mail/`. Open the verification link from there.
Private files are written to `.local-storage/`.

## First administrator

```bash
ADMIN_BOOTSTRAP_EMAIL=you@school.example ADMIN_BOOTSTRAP_PASSWORD='a-long-passphrase' npm run admin:bootstrap
```

It runs once. Afterwards, add staff from `/admin/roles`.

## Worker

The web server does not send queued email or expire opportunities by itself. Run the worker:

```bash
npm run worker            # long-running
npm run worker -- --once  # one pass, for a scheduler
```

## Checks

| Command | What it runs |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (Next.js core-web-vitals and TypeScript rules) |
| `npm test` | Unit tests for the domain rules (Vitest) |
| `npm run test:integration` | Services against a real PostgreSQL test database (`ups_alumni_test`). Create that database and run `DATABASE_URL=… npx prisma migrate deploy` first. |
| `npm run build` | Production build |

Integration tests use the test database only. They truncate its tables at the start of each run. Never
point them at a database that holds real data.

## Deployment

1. Create a Supabase project. Use its PostgreSQL database (through the pooler, with TLS) and a private Storage bucket.
2. Set the production environment variables. The app refuses to start in production with the
   development mail sink or local storage. See `.env.example` for every variable.
3. `npm run db:deploy` against production, then `npm run build`.
4. Start `npm run start` and `npm run worker` under a supervisor.
5. Bootstrap the first administrator, then work through `docs/operator-checklist.md`.

## Structure

```
src/app/            routes only: pages, layouts, route handlers, metadata
src/features/       one folder per business area: domain (pure rules), validation,
                    services (business logic and queries), actions, components
src/components/     shared UI: layout, shared primitives, shadcn/ui under ui/
src/lib/            integrations: env, db, auth, email, storage, logging, security helpers
prisma/             schema, migrations, development seed
scripts/            operator tools: bootstrap admin, worker, local PostgreSQL
tests/              integration tests and stubs
```

Dependency direction: pages and actions call services; services call the database and integrations;
domain modules import nothing from the framework.

## Known limitations

The complete list is in [`docs/operator-checklist.md`](docs/operator-checklist.md#8-known-gaps-in-this-version).
The most important are: profile photos, stories submission, the resources library, admin pages for
events and business and opportunity review (their service functions exist), CSV import and export,
multi-factor authentication for staff, the content security policy nonce, and any payment gateway.
