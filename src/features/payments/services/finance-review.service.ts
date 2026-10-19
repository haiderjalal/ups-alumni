import "server-only";

import { randomBytes } from "node:crypto";

import type { Prisma, StaffRole } from "@/generated/prisma/client";
import { recordAudit } from "@/features/audit/services/audit.service";
import { syncMembershipForUser } from "@/features/membership/services/eligibility.service";
import { createNotification } from "@/features/notifications/services/notification.service";
import { notifyMemberOfPaymentDecision } from "@/features/notifications/services/member-email.service";
import { db } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { log } from "@/lib/logger";
import { cleanSingleLine, cleanText } from "@/lib/security/text";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { amountMatchesOrder, receiptNumberFor } from "../domain/payment-rules";

/** Raised inside a transaction to roll it back and return a message the reviewer can act on. */
class ReviewConflictError extends Error {}

export interface ApprovePaymentInput {
  attemptId: string;
  actorId: string;
  actorRoles: readonly StaffRole[];
  reconciliationReference: string;
  note?: string;
}

/**
 * Confirms a transfer after the reviewer has matched it to the statement. Repeated or simultaneous approvals
 * return the same receipt: the attempt row is locked, and the confirmed-payment table allows one row per order.
 */
export async function approvePaymentAttempt(input: ApprovePaymentInput): Promise<ActionResult<{ receiptNumber: string; alreadyConfirmed: boolean; membershipActivated: boolean }>> {
  const reconciliationReference = cleanSingleLine(input.reconciliationReference).slice(0, 120);
  if (reconciliationReference.length < 4) {
    return actionError("Enter the reconciliation reference from the receiving-account statement.");
  }

  const now = new Date();
  try {
    const outcome = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "payment_attempts" WHERE "id" = ${input.attemptId} FOR UPDATE`;

      const attempt = await tx.paymentAttempt.findUnique({
        where: { id: input.attemptId },
        include: { order: { select: { id: true, userId: true, amountMinor: true, status: true } }, confirmed: true },
      });
      if (!attempt) {
        throw new ReviewConflictError("This payment attempt could not be found.");
      }

      if (attempt.status === "CONFIRMED" && attempt.confirmed) {
        return { receiptNumber: attempt.confirmed.receiptNumber, alreadyConfirmed: true, membershipActivated: false, userId: attempt.order.userId, attemptId: attempt.id };
      }
      if (attempt.status !== "SUBMITTED") {
        throw new ReviewConflictError("This transfer was rejected. The member needs to submit new evidence.");
      }
      if (!amountMatchesOrder(attempt.amountMinor, attempt.order.amountMinor)) {
        throw new ReviewConflictError("The amount on this attempt does not match the order. Reject it and ask for corrected evidence.");
      }

      const attemptUpdate = await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "SUBMITTED" },
        data: {
          status: "CONFIRMED",
          reviewedById: input.actorId,
          reviewedAt: now,
          reconciliationReference,
          reviewNote: input.note ? cleanText(input.note).slice(0, 600) : null,
          version: { increment: 1 },
        },
      });
      if (attemptUpdate.count !== 1) {
        throw new ReviewConflictError("Another reviewer has just changed this attempt. Refresh and check its status.");
      }

      const orderUpdate = await tx.registrationOrder.updateMany({
        where: { id: attempt.order.id, status: "AWAITING_REVIEW" },
        data: { status: "CONFIRMED" },
      });
      if (orderUpdate.count !== 1) {
        throw new ReviewConflictError("This order is not waiting for review. Refresh and check its status.");
      }

      const receiptNumber = receiptNumberFor(now, randomBytes(4).toString("hex").toUpperCase());
      await tx.confirmedPayment.create({
        data: {
          orderId: attempt.order.id,
          attemptId: attempt.id,
          receiptNumber,
          amountMinor: attempt.amountMinor,
          currency: attempt.currency,
          method: attempt.method,
          receivingAccountId: attempt.receivingAccountId,
          transactionReference: attempt.transactionReference,
          reconciliationReference,
          confirmedById: input.actorId,
          confirmedAt: now,
        },
      });

      await recordAudit(tx, {
        action: "payment.confirmed",
        entityType: "payment_attempt",
        entityId: attempt.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
        metadata: { orderId: attempt.order.id, amountMinor: attempt.amountMinor },
      });

      await createNotification(tx, {
        userId: attempt.order.userId,
        kind: "PAYMENT_UPDATE",
        title: "Registration fee confirmed",
        body: `Your registration fee of ${formatRupees(attempt.amountMinor)} has been confirmed. Receipt ${receiptNumber}.`,
        linkPath: "/app/payment",
      });

      const membership = await syncMembershipForUser(attempt.order.userId, tx);
      if (membership.activated) {
        await createNotification(tx, {
          userId: attempt.order.userId,
          kind: "MEMBERSHIP_UPDATE",
          title: "Welcome to the network",
          body: "Your membership is active. You can now use the directory, events and community spaces.",
          linkPath: "/app",
        });
      }

      return { receiptNumber, alreadyConfirmed: false, membershipActivated: membership.activated, userId: attempt.order.userId, attemptId: attempt.id };
    });

    if (!outcome.alreadyConfirmed) {
      await notifyMemberOfPaymentDecision({
        userId: outcome.userId,
        attemptId: outcome.attemptId,
        decision: "CONFIRMED",
        membershipActivated: outcome.membershipActivated,
      });
    }
    return actionOk({
      receiptNumber: outcome.receiptNumber,
      alreadyConfirmed: outcome.alreadyConfirmed,
      membershipActivated: outcome.membershipActivated,
    });
  } catch (error) {
    if (error instanceof ReviewConflictError) {
      return actionError(error.message);
    }
    log("error", "payment.approve_failed", { attemptId: input.attemptId, actorId: input.actorId });
    throw error;
  }
}

export interface RejectPaymentInput {
  attemptId: string;
  actorId: string;
  actorRoles: readonly StaffRole[];
  reason: string;
}

/** Rejects evidence with a reason the member can read. The order returns to UNPAID so a corrected transfer can be sent. */
export async function rejectPaymentAttempt(input: RejectPaymentInput): Promise<ActionResult> {
  const reason = cleanText(input.reason);
  if (reason.length < 10) {
    return actionError("Give the member a clear reason (at least 10 characters).");
  }

  try {
    const outcome = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT "id" FROM "payment_attempts" WHERE "id" = ${input.attemptId} FOR UPDATE`;
      const attempt = await tx.paymentAttempt.findUnique({
        where: { id: input.attemptId },
        select: { id: true, status: true, orderId: true, order: { select: { userId: true } } },
      });
      if (!attempt) {
        throw new ReviewConflictError("This payment attempt could not be found.");
      }
      if (attempt.status !== "SUBMITTED") {
        throw new ReviewConflictError("Only submitted evidence can be rejected.");
      }

      await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "SUBMITTED" },
        data: {
          status: "REJECTED",
          reviewedById: input.actorId,
          reviewedAt: new Date(),
          reviewNote: reason.slice(0, 600),
          version: { increment: 1 },
        },
      });
      await tx.registrationOrder.updateMany({
        where: { id: attempt.orderId, status: "AWAITING_REVIEW" },
        data: { status: "UNPAID" },
      });
      await recordAudit(tx, {
        action: "payment.rejected",
        entityType: "payment_attempt",
        entityId: attempt.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
        metadata: { orderId: attempt.orderId },
      });
      await createNotification(tx, {
        userId: attempt.order.userId,
        kind: "PAYMENT_UPDATE",
        title: "Payment evidence needs correction",
        body: reason.slice(0, 300),
        linkPath: "/app/payment",
      });
      return { userId: attempt.order.userId, attemptId: attempt.id };
    });

    await notifyMemberOfPaymentDecision({ userId: outcome.userId, attemptId: outcome.attemptId, decision: "REJECTED", membershipActivated: false });
    return actionOk();
  } catch (error) {
    if (error instanceof ReviewConflictError) {
      return actionError(error.message);
    }
    throw error;
  }
}

/** Queue for finance reviewers. Receipts are linked by id only; the file is served by the authorized route. */
export async function listPaymentAttemptsForReview(status: "SUBMITTED" | "CONFIRMED" | "REJECTED", limit: number) {
  return db.paymentAttempt.findMany({
    where: { status },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      status: true,
      method: true,
      amountMinor: true,
      paidOn: true,
      createdAt: true,
      reviewedAt: true,
      order: { select: { reference: true, amountMinor: true, userId: true, user: { select: { name: true } } } },
    },
  });
}

export async function getPaymentAttemptForReview(attemptId: string) {
  return db.paymentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      status: true,
      method: true,
      transactionReference: true,
      amountMinor: true,
      currency: true,
      paidOn: true,
      payerName: true,
      reviewNote: true,
      reconciliationReference: true,
      receiptMediaId: true,
      createdAt: true,
      order: { select: { id: true, reference: true, amountMinor: true, status: true, userId: true, user: { select: { name: true, email: true } } } },
      receivingAccount: { select: { label: true, accountTitle: true, accountIdentifier: true } },
    },
  });
}
