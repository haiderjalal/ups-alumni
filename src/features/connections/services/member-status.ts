import "server-only";

import type { DbClient } from "@/features/audit/services/audit.service";

/** Returns the subset of ids that hold an ACTIVE membership. Suspended, pending and closed members are excluded. */
export async function loadActiveMemberIds(client: DbClient, userIds: readonly string[]): Promise<Set<string>> {
  if (userIds.length === 0) {
    return new Set();
  }
  const rows = await client.membership.findMany({
    where: { userId: { in: [...userIds] }, status: "ACTIVE" },
    select: { userId: true },
  });
  return new Set(rows.map((row) => row.userId));
}
