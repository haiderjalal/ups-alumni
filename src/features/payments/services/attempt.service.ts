import "server-only";

import { z } from "zod";

import { recordAudit } from "@/features/audit/services/audit.service";
import { createNotification } from "@/features/notifications/services/notification.service";
import { db } from "@/lib/db";
import { rupeesToMinor } from "@/lib/money";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { amountMatchesOrder, checkPaymentDate, checkTransactionReference } from "../domain/payment-rules";

const submitAttemptSchema = z.object({
  orderId: z.string().min(1).max(64),
  transactionReference: z.string().trim().min(1, "Enter the transaction reference from your transfer.").max(80),
  amountRupees: z.coerce.number({ message: "Enter the amount you paid." }).positive("Enter the amount you paid."),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date of the transfer."),
  payerName: z.string().trim().max(120).optional().default(""),
  receiptMediaId: z.string().min(1, "Upload a screenshot or PDF of your receipt."),
});

export type SubmitAttemptInput = z.input<typeof submitAttemptSchema>;

export type AttemptFieldErrors = Partial<Record<keyof SubmitAttemptInput, string>>;

/**
 * Records payment evidence. The order moves to AWAITING_REVIEW, and nothing is marked paid. The lock on the order
 * row serializes concurrent submissions, and the partial unique indexes in the database stop duplicates.
 */
export async function submitPaymentAttempt(input: {
  userId: string;
  values: unknown;
  now?: Date;
}): Promise<ActionResult<{ attemptId: string }> & { fieldErrors?: AttemptFieldErrors }> {
  const now = input.now ?? new Date();
  const parsed = submitAttemptSchema.safeParse(input.values);
  if (!parsed.success) {
    const fieldErrors: AttemptFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof SubmitAttemptInput;
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  const reference = checkTransactionReference(data.transactionReference);
  if (!reference.ok) {
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: { transactionReference: reference.message ?? "Check the transaction reference." } };
  }

  const paidOn = new Date(`${data.paidOn}T00:00:00.000Z`);
  if (Number.isNaN(paidOn.getTime())) {
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: { paidOn: "Enter a valid date." } };
  }
  const dateCheck = checkPaymentDate(paidOn, now);
  if (!dateCheck.ok) {
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: { paidOn: dateCheck.message ?? "Check the payment date." } };
  }

  const order = await db.registrationOrder.findFirst({
    where: { id: data.orderId, userId: input.userId },
    select: { id: true, status: true, amountMinor: true, receivingAccountId: true, receivingMethod: true },
  });
  if (!order) {
    return actionError("This payment reference could not be found on your account.");
  }
  if (order.status === "AWAITING_REVIEW") {
    return actionError("A payment for this order is already awaiting review. You will be notified when it is checked.");
  }
  if (order.status !== "UNPAID") {
    return actionError("This order no longer accepts payment evidence.");
  }

  const account = order.receivingAccountId
    ? await db.receivingAccount.findUnique({
        where: { id: order.receivingAccountId },
        select: { isActive: true, method: true, accountTitle: true, accountIdentifier: true },
      })
    : null;
  if (!account?.isActive || !account.accountTitle || !account.accountIdentifier) {
    return actionError("The receiving account for this order is no longer active. Contact the network team before paying.");
  }

  const amountMinor = rupeesToMinor(data.amountRupees);
  if (!amountMatchesOrder(amountMinor, order.amountMinor)) {
    return {
      ok: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: { amountRupees: "The amount must match the registration fee quoted on your order." },
    };
  }

  const receipt = await db.mediaAsset.findFirst({
    where: { id: data.receiptMediaId, ownerId: input.userId, kind: "RECEIPT", deletedAt: null },
    select: { id: true },
  });
  if (!receipt) {
    return { ok: false, message: "Please correct the highlighted fields.", fieldErrors: { receiptMediaId: "Upload your receipt again." } };
  }

  try {
    const attempt = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "registration_orders" WHERE "id" = ${order.id} FOR UPDATE`;
      const locked = await tx.registrationOrder.findUniqueOrThrow({ where: { id: order.id }, select: { status: true } });
      if (locked.status !== "UNPAID") {
        throw new SubmissionConflictError("This order no longer accepts payment evidence.");
      }

      const created = await tx.paymentAttempt.create({
        data: {
          orderId: order.id,
          status: "SUBMITTED",
          method: account.method,
          receivingAccountId: order.receivingAccountId,
          transactionReference: reference.normalized,
          normalizedReference: reference.normalized,
          amountMinor,
          currency: "PKR",
          paidOn,
          payerName: data.payerName ? data.payerName.slice(0, 120) : null,
          receiptMediaId: receipt.id,
          submittedById: input.userId,
        },
        select: { id: true },
      });

      const moved = await tx.registrationOrder.updateMany({
        where: { id: order.id, status: "UNPAID" },
        data: { status: "AWAITING_REVIEW" },
      });
      if (moved.count !== 1) {
        throw new SubmissionConflictError("This order no longer accepts payment evidence.");
      }

      await recordAudit(tx, {
        action: "payment_attempt.submitted",
        entityType: "payment_attempt",
        entityId: created.id,
        actorId: input.userId,
        metadata: { orderId: order.id, amountMinor },
      });
      await createNotification(tx, {
        userId: input.userId,
        kind: "PAYMENT_UPDATE",
        title: "Payment evidence received",
        body: "A finance reviewer will check your transfer against the receiving-account statement. This can take a few working days.",
        linkPath: "/app/payment",
      });
      return created;
    });
    return actionOk({ attemptId: attempt.id });
  } catch (error) {
    if (error instanceof SubmissionConflictError) {
      return actionError(error.message);
    }
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: "Please correct the highlighted fields.",
        fieldErrors: { transactionReference: "This transaction reference or receipt has already been submitted." },
      };
    }
    throw error;
  }
}

class SubmissionConflictError extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
