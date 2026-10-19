/**
 * Scheduled worker. Run as its own long-lived process next to the web server (see docs/operations.md).
 *
 *   npm run worker            # loops forever, every 30 seconds
 *   npm run worker -- --once  # one pass, suitable for cron or a platform scheduler
 *
 * Each pass retries due outbound email and expires opportunities whose deadline has passed. Both steps are
 * idempotent, so overlapping workers or a restart never double-send or double-expire.
 */
import { dispatchDueEmails } from "@/lib/email/outbox";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { expireOpportunities } from "@/features/opportunities/services/opportunity-review.service";

const INTERVAL_MS = 30_000;

async function runPass(): Promise<void> {
  const email = await dispatchDueEmails(50);
  const expired = await expireOpportunities(new Date());
  log("info", "worker.pass_complete", { emailSent: email.sent, emailRetry: email.retryScheduled, emailFailed: email.failed, opportunitiesExpired: expired });
}

async function main(): Promise<void> {
  const once = process.argv.includes("--once");
  do {
    try {
      await runPass();
    } catch (error) {
      log("error", "worker.pass_failed", { error });
    }
    if (!once) {
      await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
    }
  } while (!once);
}

const shutdown = async (): Promise<void> => {
  await db.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(async (error: unknown) => {
  log("error", "worker.fatal", { error });
  await db.$disconnect();
  process.exitCode = 1;
});
