"use server";

import { requireStaffRole } from "@/lib/session";
import type { ActionResult } from "@/types/action";
import { actionError } from "@/types/action";

import { approvePaymentAttempt, rejectPaymentAttempt } from "../services/finance-review.service";
import { decideRefund, markRefundFailed, markRefundProcessed, retryFailedRefund } from "../services/refund.service";

const FINANCE_ROLES = ["FINANCE_REVIEWER", "SUPER_ADMIN"] as const;

export async function approvePaymentAction(input: {
  attemptId: string;
  reconciliationReference: string;
  note: string;
}): Promise<ActionResult<{ receiptNumber: string; alreadyConfirmed: boolean; membershipActivated: boolean }>> {
  const staff = await requireStaffRole(FINANCE_ROLES);
  if (!input.attemptId) {
    return actionError("Select a payment to review.");
  }
  return approvePaymentAttempt({
    attemptId: input.attemptId,
    actorId: staff.id,
    actorRoles: staff.roles,
    reconciliationReference: input.reconciliationReference,
    note: input.note,
  });
}

export async function rejectPaymentAction(input: { attemptId: string; reason: string }): Promise<ActionResult> {
  const staff = await requireStaffRole(FINANCE_ROLES);
  return rejectPaymentAttempt({ attemptId: input.attemptId, actorId: staff.id, actorRoles: staff.roles, reason: input.reason });
}

export async function decideRefundAction(input: { refundId: string; decision: "APPROVED" | "REJECTED"; note: string }): Promise<ActionResult> {
  const staff = await requireStaffRole(FINANCE_ROLES);
  return decideRefund({ refundId: input.refundId, decision: input.decision, note: input.note, actorId: staff.id, actorRoles: staff.roles });
}

export async function markRefundProcessedAction(input: { refundId: string; transactionEvidence: string }): Promise<ActionResult> {
  const staff = await requireStaffRole(FINANCE_ROLES);
  return markRefundProcessed({ refundId: input.refundId, transactionEvidence: input.transactionEvidence, actorId: staff.id, actorRoles: staff.roles });
}

export async function markRefundFailedAction(input: { refundId: string; reason: string }): Promise<ActionResult> {
  const staff = await requireStaffRole(FINANCE_ROLES);
  return markRefundFailed({ refundId: input.refundId, reason: input.reason, actorId: staff.id, actorRoles: staff.roles });
}

export async function retryFailedRefundAction(input: { refundId: string; note: string }): Promise<ActionResult> {
  const staff = await requireStaffRole(FINANCE_ROLES);
  return retryFailedRefund({ refundId: input.refundId, note: input.note, actorId: staff.id, actorRoles: staff.roles });
}
