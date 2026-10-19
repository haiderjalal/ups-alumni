# Operations: workers, backups and restore

## Processes

The application has two processes that must both run in production:

1. **Web server**: `npm run build` then `npm run start`, or any Node.js 20.9+ host.
2. **Worker**: `npm run worker`. It loops every 30 seconds, sends due email from the outbox, and expires
   opportunities whose deadline has passed. For a platform scheduler instead of a long-lived process,
   run `npm run worker -- --once` on a schedule (every 1–5 minutes).

Both processes need the same environment. The worker is safe to run more than one instance: email
claims use `FOR UPDATE SKIP LOCKED`, and expiry is idempotent.

## Health

`GET /api/health` returns `200` with `{"status":"ok","database":"ok"}`, or `503` when the database is
unreachable. It returns no version or configuration details.

## Bootstrapping the first administrator

Run once, from a terminal, after migrations:

```bash
ADMIN_BOOTSTRAP_EMAIL=you@school.example ADMIN_BOOTSTRAP_PASSWORD='use-a-long-passphrase' npm run admin:bootstrap
```

The script refuses to run when a super administrator already exists. Clear the password from your
shell history afterwards. Other staff are added from `/admin/roles`.

## Development seed

`npm run db:seed` creates synthetic members on `example.com`, a fee schedule, and sample batches.
It refuses to run when `NODE_ENV=production`. It creates **no** receiving accounts; finance enters real
details in `/admin/settings`.

## Backups

- Back up PostgreSQL daily with point-in-time recovery where the host supports it. Payment and audit
  history live in the database, so this is the most important backup.
- Back up the private Supabase Storage bucket (receipts and documents) on the same schedule as the database. Supabase's own database backups do not include Storage objects.
  A database restore without its matching files leaves receipts unreadable.
- Keep the `BETTER_AUTH_SECRET` value in your secret store with the backup. Rotating it signs every
  member out.

## Restore drill

Test a restore at least once before live collections:

1. Restore the database backup into an empty instance.
2. Run `npx prisma migrate status` against it. It must report no pending migrations.
3. Restore the Storage bucket and confirm that one receipt opens through `/admin/payments/[id]`.
4. Start the web server and worker, then open `/api/health`.

## Email

Outbound email is stored in `email_outbox` first. A row stays PENDING until it is delivered. After eight
failed attempts it is marked FAILED and needs operator attention: check the SMTP settings, then reset
the row to PENDING (`status`, `attempts = 0`, `nextAttemptAt = now()`).

Message bodies are cleared once a message is sent, because some carry single-use links.

## Logs

The application writes one JSON line per business event to stdout. Ship these to your log platform.
Logs never contain passwords, tokens, receipt URLs, account numbers or transfer references; those keys are
redacted by `src/lib/logger.ts`.
