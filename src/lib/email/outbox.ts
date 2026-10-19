import "server-only";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";

import { getEmailTransport } from "./transports";
import type { EmailMessage } from "./types";

const MAX_ATTEMPTS = 8;
const LEASE_MINUTES = 5;
const DEFAULT_BATCH_SIZE = 20;

export interface EnqueueEmailInput extends EmailMessage {
  /** Stable key for the logical event, e.g. `verification:<userId>:<issuedAt>`. Repeats are ignored. */
  dedupeKey: string;
}

interface ClaimedEmailRow {
  id: string;
  toAddress: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  attempts: number;
}

export interface DispatchSummary {
  sent: number;
  retryScheduled: number;
  failed: number;
}

/** Strips CR and LF so a value cannot inject extra mail headers. */
function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Stores a message in the durable outbox. Calling again with the same dedupeKey
 * does nothing, so retries of the same business event never send duplicates.
 */
export async function enqueueEmail(input: EnqueueEmailInput): Promise<string> {
  const row = await db.emailOutbox.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: {
      dedupeKey: input.dedupeKey,
      toAddress: singleLine(input.to),
      subject: singleLine(input.subject),
      bodyText: input.text,
      bodyHtml: input.html ?? null,
    },
    update: {},
    select: { id: true },
  });
  return row.id;
}

/**
 * Claims due messages with FOR UPDATE SKIP LOCKED so concurrent workers never send the same row,
 * then delivers them. Failed attempts back off; after MAX_ATTEMPTS the row is marked FAILED for operator review.
 */
export async function dispatchDueEmails(batchSize = DEFAULT_BATCH_SIZE): Promise<DispatchSummary> {
  const claimed = await db.$queryRaw<ClaimedEmailRow[]>`
    UPDATE "email_outbox"
    SET "attempts" = "attempts" + 1,
        "nextAttemptAt" = now() + (${LEASE_MINUTES} * interval '1 minute')
    WHERE "id" IN (
      SELECT "id" FROM "email_outbox"
      WHERE "status" = 'PENDING' AND "nextAttemptAt" <= now()
      ORDER BY "nextAttemptAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "toAddress", "subject", "bodyText", "bodyHtml", "attempts"
  `;

  const summary: DispatchSummary = { sent: 0, retryScheduled: 0, failed: 0 };
  const transport = getEmailTransport();

  for (const row of claimed) {
    try {
      await transport.send(
        {
          to: row.toAddress,
          subject: row.subject,
          text: row.bodyText ?? "",
          html: row.bodyHtml ?? undefined,
        },
        { idempotencyKey: row.id },
      );
      // Clear bodies after delivery: they may contain single-use sign-in or reset links.
      await db.emailOutbox.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), bodyText: null, bodyHtml: null, lastError: null },
      });
      summary.sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.name : "UnknownError";
      const exhausted = row.attempts >= MAX_ATTEMPTS;
      const backoffMinutes = Math.min(60, 2 ** row.attempts);

      await db.emailOutbox.update({
        where: { id: row.id },
        data: exhausted
          ? { status: "FAILED", lastError: message }
          : {
              lastError: message,
              nextAttemptAt: new Date(Date.now() + backoffMinutes * 60_000),
            },
      });

      if (exhausted) {
        summary.failed += 1;
        log("error", "email.failed", { outboxId: row.id, attempts: row.attempts });
      } else {
        summary.retryScheduled += 1;
        log("warn", "email.retry_scheduled", { outboxId: row.id, attempts: row.attempts });
      }
    }
  }

  return summary;
}

/** Enqueues a message and attempts immediate delivery. Failures stay in the outbox for the worker. */
export async function sendEmailNow(input: EnqueueEmailInput): Promise<void> {
  await enqueueEmail(input);
  try {
    await dispatchDueEmails(5);
  } catch (error) {
    log("error", "email.immediate_dispatch_failed", { error });
  }
}
