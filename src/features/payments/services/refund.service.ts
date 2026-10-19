import "server-only";

import type { Prisma, StaffRole } from "@/generated/prisma/client";
import { recordAudit } from "@/features/audit/services/audit.service";
import { revokeMemberAccess } from "@/features/membership/services/membership-transition.service";
import { createNotification } from "@/features/notifications/services/notification.service";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { cleanSingleLine, cleanText } from "@/lib/security/text";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { assertRefundTransition, canTransitionOrder, type RefundState } from "@/features/membership/domain/state-machines";

class RefundConflictError extends Error {}

/**
 * Opens a refund request when an application is rejected after its fee was confirmed. The request is visible in
 * the finance queue and never marks money as returned by itself.
 */
export async function openAutomaticRefundRequest(
  tx: Prisma.TransactionClient,
  input: { userId: string; reason: string },
): Promise<{ refundId: string | null }> {
  const confirmed = await tx.registrationOrder.findFirst({
    where: { userId: input.userId, status: "CONFIRMED" },
    select: { id: true, amountMinor: true, currency: true },
  });
  if (!confirmed) {
    return { refundId: null };
  }

  const existing = await tx.refund.findFirst({
    where: { orderId: confirmed.id, status: { in: ["REQUESTED", "APPROVED", "PROCESSED"] } },
    select: { id: true },
  });
  if (existing) {
    return { refundId: existing.id };
  }

  const refund = await tx.refund.create({
    data: {
      orderId: confirmed.id,
      status: "REQUESTED",
      source: "AUTOMATIC_REJECTION",
      amountMinor: confirmed.amountMinor,
      currency: confirmed.currency,
      reason: cleanText(input.reason).slice(0, 600),
    },
    select: { id: true },
  });
  await recordAudit(tx, {
    action: "refund.requested",
    entityType: "refund",
    entityId: refund.id,
    actorId: null,
    metadata: { orderId: confirmed.id, source: "AUTOMATIC_REJECTION" },
  });
  return { refundId: refund.id };
}

interface RefundDecisionInput {
  refundId: string;
  actorId: string;
  actorRoles: readonly StaffRole[];
}

/**
 * Approving a refund removes access straight away (membership is suspended), so a member cannot keep using
 * the network while their money is being returned. Processing a full refund closes the membership.
 */
export async function decideRefund(
  input: RefundDecisionInput & { decision: "APPROVED" | "REJECTED"; note: string },
): Promise<ActionResult> {
  const note = cleanText(input.note);
  if (note.length < 5) {
    return actionError("Record the reason for this decision (at least 5 characters).");
  }

  try {
    await db.$transaction(async (tx) => {
      const refund = await lockRefund(tx, input.refundId);
      assertRefundTransition(refund.status as RefundState, input.decision);

      const updated = await tx.refund.updateMany({
        where: { id: refund.id, status: "REQUESTED" },
        data: { status: input.decision, decidedById: input.actorId, decidedAt: new Date(), failureReason: null },
      });
      if (updated.count !== 1) {
        throw new RefundConflictError("This refund was already decided.");
      }

      if (input.decision === "APPROVED") {
        await revokeMemberAccess(tx, {
          userId: refund.order.userId,
          to: "SUSPENDED",
          reason: "Registration fee refund approved",
          actorId: input.actorId,
          actorRoles: [...input.actorRoles],
        });
      }

      await recordAudit(tx, {
        action: `refund.${input.decision.toLowerCase()}`,
        entityType: "refund",
        entityId: refund.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
        metadata: { note: note.slice(0, 120) },
      });
      await createNotification(tx, {
        userId: refund.order.userId,
        kind: "PAYMENT_UPDATE",
        title: input.decision === "APPROVED" ? "Refund approved" : "Refund request declined",
        body: cleanSingleLine(note).slice(0, 300),
        linkPath: "/app/payment",
      });
    });
    return actionOk();
  } catch (error) {
    return handleRefundError(error, input.refundId);
  }
}

/** Records that money has actually left the receiving account. Requires transaction evidence from finance. */
export async function markRefundProcessed(
  input: RefundDecisionInput & { transactionEvidence: string },
): Promise<ActionResult> {
  const evidence = cleanSingleLine(input.transactionEvidence).slice(0, 200);
  if (evidence.length < 6) {
    return actionError("Enter the transfer reference that returned the money.");
  }

  try {
    await db.$transaction(async (tx) => {
      const refund = await lockRefund(tx, input.refundId);
      assertRefundTransition(refund.status as RefundState, "PROCESSED");

      const updated = await tx.refund.updateMany({
        where: { id: refund.id, status: "APPROVED" },
        data: {
          status: "PROCESSED",
          processedById: input.actorId,
          processedAt: new Date(),
          transactionEvidence: evidence,
        },
      });
      if (updated.count !== 1) {
        throw new RefundConflictError("This refund is no longer awaiting processing.");
      }

      if (canTransitionOrder("CONFIRMED", "REFUNDED")) {
        await tx.registrationOrder.updateMany({
          where: { id: refund.order.id, status: "CONFIRMED" },
          data: { status: "REFUNDED" },
        });
      }

      await revokeMemberAccess(tx, {
        userId: refund.order.userId,
        to: "CLOSED",
        reason: "Registration fee refunded in full",
        actorId: input.actorId,
        actorRoles: [...input.actorRoles],
      });
      await recordAudit(tx, {
        action: "refund.processed",
        entityType: "refund",
        entityId: refund.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
        metadata: { orderId: refund.order.id },
      });
    });
    return actionOk();
  } catch (error) {
    return handleRefundError(error, input.refundId);
  }
}

/** Records a failed transfer. The refund stays open, so finance can retry or record a different outcome. */
export async function markRefundFailed(input: RefundDecisionInput & { reason: string }): Promise<ActionResult> {
  const reason = cleanText(input.reason);
  if (reason.length < 5) {
    return actionError("Record why the transfer failed (at least 5 characters).");
  }

  try {
    await db.$transaction(async (tx) => {
      const refund = await lockRefund(tx, input.refundId);
      assertRefundTransition(refund.status as RefundState, "FAILED");
      await tx.refund.updateMany({
        where: { id: refund.id, status: "APPROVED" },
        data: { status: "FAILED", failureReason: reason.slice(0, 600) },
      });
      await recordAudit(tx, {
        action: "refund.failed",
        entityType: "refund",
        entityId: refund.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
      });
    });
    return actionOk();
  } catch (error) {
    return handleRefundError(error, input.refundId);
  }
}

async function lockRefund(tx: Prisma.TransactionClient, refundId: string) {
  await tx.$queryRaw`SELECT "id" FROM "refunds" WHERE "id" = ${refundId} FOR UPDATE`;
  const refund = await tx.refund.findUnique({
    where: { id: refundId },
    select: { id: true, status: true, order: { select: { id: true, userId: true } } },
  });
  if (!refund) {
    throw new RefundConflictError("This refund could not be found.");
  }
  return refund;
}

function handleRefundError(error: unknown, refundId: string): ActionResult {
  if (error instanceof RefundConflictError) {
    return actionError(error.message);
  }
  if (error instanceof Error && error.name === "InvalidTransitionError") {
    return actionError("This refund cannot move to that state from its current status.");
  }
  log("error", "refund.operation_failed", { refundId });
  return actionError("The refund could not be updated. Refresh and try again.");
}

export async function listRefundQueue(statuses: RefundState[], limit: number) {
  return db.refund.findMany({
    where: { status: { in: statuses } },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      status: true,
      source: true,
      amountMinor: true,
      reason: true,
      failureReason: true,
      createdAt: true,
      order: { select: { id: true, reference: true, userId: true, user: { select: { name: true } } } },
    },
  });
}

/** Puts a failed refund back into the approved state so finance can attempt the transfer again. */
export async function retryFailedRefund(input: RefundDecisionInput & { note: string }): Promise<ActionResult> {
  const note = cleanText(input.note);
  if (note.length < 5) {
    return actionError("Record why the transfer is being retried (at least 5 characters).");
  }

  try {
    await db.$transaction(async (tx) => {
      const refund = await lockRefund(tx, input.refundId);
      assertRefundTransition(refund.status as RefundState, "APPROVED");
      const updated = await tx.refund.updateMany({
        where: { id: refund.id, status: "FAILED" },
        data: { status: "APPROVED", failureReason: null },
      });
      if (updated.count !== 1) {
        throw new RefundConflictError("This refund is no longer failed.");
      }
      await recordAudit(tx, {
        action: "refund.retry_approved",
        entityType: "refund",
        entityId: refund.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
        metadata: { note: note.slice(0, 120) },
      });
    });
    return actionOk();
  } catch (error) {
    return handleRefundError(error, input.refundId);
  }
}
