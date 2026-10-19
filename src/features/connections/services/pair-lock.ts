import "server-only";

import type { DbClient } from "@/features/audit/services/audit.service";

/**
 * Transaction-scoped advisory lock. Every write that changes one member pair (requests, blocks, connections,
 * conversations) and every message send takes the pair lock first. A block therefore cannot interleave with a
 * request or message that was checked against the previous state. The lock is released on commit or rollback.
 */
export async function acquireTransactionLock(client: DbClient, key: string): Promise<void> {
  await client.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}

export function pairLockKey(pairKey: string): string {
  return `pair:${pairKey}`;
}

/** Taken after the pair lock when a sender's rate window is checked, so concurrent sends cannot exceed the limit. */
export function senderLockKey(userId: string): string {
  return `message-sender:${userId}`;
}
