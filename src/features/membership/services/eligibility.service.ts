import "server-only";

import { loadApplicationSnapshot } from "@/features/registration/services/application-snapshot.service";
import { isApplicationComplete } from "@/features/registration/domain/completeness";
import { recordAudit, type DbClient } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";
import { currentYearInZone } from "@/lib/time";

import { evaluateEligibility, type EligibilityFacts, type EligibilityResult } from "../domain/eligibility";
import { canTransitionMembership, type MembershipState } from "../domain/state-machines";

export interface MembershipSyncResult {
  membershipStatus: MembershipState | null;
  /** True only for the call that performed the PENDING -> ACTIVE transition. Use it to send one-time notices. */
  activated: boolean;
  result: EligibilityResult;
}

/** Reads each activation fact from the database. Submitted receipts and approvals alone never count. */
export async function loadEligibilityFacts(client: DbClient, userId: string): Promise<EligibilityFacts> {
  const [user, application, snapshot, confirmedCount, blockingRefundCount] = await Promise.all([
    client.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
    client.alumniApplication.findUnique({ where: { userId }, select: { status: true } }),
    loadApplicationSnapshot(client, userId),
    client.confirmedPayment.count({ where: { order: { userId } } }),
    client.refund.count({
      where: { order: { userId }, status: { in: ["APPROVED", "PROCESSED"] } },
    }),
  ]);

  return {
    emailVerified: Boolean(user?.emailVerified),
    applicationComplete: isApplicationComplete(snapshot, currentYearInZone()),
    applicationApproved: application?.status === "APPROVED",
    feeConfirmed: confirmedCount > 0,
    refundBlocksAccess: blockingRefundCount > 0,
  };
}

/**
 * Activates a PENDING membership once every fact holds. Idempotent: the guarded updateMany succeeds for
 * exactly one caller, so repeated or concurrent syncs cannot create a second activation or audit entry.
 */
export async function syncMembershipForUser(userId: string, client: DbClient = db): Promise<MembershipSyncResult> {
  const membership = await client.membership.findUnique({
    where: { userId },
    select: { id: true, status: true },
  });
  const facts = await loadEligibilityFacts(client, userId);
  const result = evaluateEligibility(facts);

  if (!membership) {
    return { membershipStatus: null, activated: false, result };
  }

  const current = membership.status;
  if (current !== "PENDING" || !result.eligible || !canTransitionMembership("PENDING", "ACTIVE")) {
    return { membershipStatus: current, activated: false, result };
  }

  const updated = await client.membership.updateMany({
    where: { userId, status: "PENDING" },
    data: { status: "ACTIVE", activatedAt: new Date() },
  });

  if (updated.count !== 1) {
    return { membershipStatus: "ACTIVE", activated: false, result };
  }

  await recordAudit(client, {
    action: "membership.activated",
    entityType: "membership",
    entityId: membership.id,
    actorId: null,
    metadata: { reason: "all_requirements_met" },
  });

  return { membershipStatus: "ACTIVE", activated: true, result };
}

/** Membership state plus outstanding gaps, for the member status page. Read-only. */
export async function getMembershipOverview(userId: string): Promise<{
  membershipStatus: MembershipState | null;
  result: EligibilityResult;
}> {
  const membership = await db.membership.findUnique({ where: { userId }, select: { status: true } });
  const facts = await loadEligibilityFacts(db, userId);
  return { membershipStatus: membership?.status ?? null, result: evaluateEligibility(facts) };
}
