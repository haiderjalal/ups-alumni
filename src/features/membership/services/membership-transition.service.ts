import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/features/audit/services/audit.service";

import { canTransitionMembership, type MembershipState } from "../domain/state-machines";

/**
 * Moves a membership to SUSPENDED or CLOSED and removes every active session for that member, so access ends
 * at once. The move is skipped when the transition is not permitted from the current state (for example a
 * PENDING membership cannot be "suspended"), and the function reports what happened.
 */
export async function revokeMemberAccess(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    to: Extract<MembershipState, "SUSPENDED" | "CLOSED">;
    reason: string;
    actorId: string | null;
    actorRoles?: string[];
  },
): Promise<{ moved: boolean; from: MembershipState | null }> {
  const membership = await tx.membership.findUnique({
    where: { userId: input.userId },
    select: { id: true, status: true },
  });
  if (!membership) {
    return { moved: false, from: null };
  }

  const from = membership.status;
  if (!canTransitionMembership(from, input.to)) {
    return { moved: false, from };
  }

  const now = new Date();
  await tx.membership.update({
    where: { id: membership.id },
    data:
      input.to === "SUSPENDED"
        ? { status: "SUSPENDED", suspendedAt: now, suspendedReason: input.reason.slice(0, 600) }
        : { status: "CLOSED", closedAt: now, closedReason: input.reason.slice(0, 600) },
  });
  await tx.session.deleteMany({ where: { userId: input.userId } });

  await recordAudit(tx, {
    action: `membership.${input.to.toLowerCase()}`,
    entityType: "membership",
    entityId: membership.id,
    actorId: input.actorId,
    metadata: { from, reason: input.reason.slice(0, 120) },
  });
  return { moved: true, from };
}
