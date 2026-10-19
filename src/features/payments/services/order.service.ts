import "server-only";

import type { PaymentMethod, Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";
import { createOrderReference } from "@/lib/ids";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { DEFAULT_REGISTRATION_FEE_MINOR, REGISTRATION_FEE_CODE, getEffectiveRegistrationFee } from "./fee.service";
import { listActiveReceivingAccounts } from "./payment-setup.service";

/** Application states from which a payment reference may be created. Earlier states are not yet reviewable. */
const PAYABLE_APPLICATION_STATES = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED"] as const;

export interface OrderView {
  id: string;
  reference: string;
  amountMinor: number;
  currency: string;
  status: "UNPAID" | "AWAITING_REVIEW" | "CONFIRMED" | "REFUNDED";
  receivingMethod: PaymentMethod | null;
  receivingTitle: string | null;
  receivingIdentifier: string | null;
  receivingAccountId: string | null;
  createdAt: Date;
}

export interface PaymentOverview {
  emailVerified: boolean;
  applicationStatus: string | null;
  canCreateOrder: boolean;
  blockedReason: string | null;
  feeMinor: number;
  currency: string;
  order: OrderView | null;
  accounts: Awaited<ReturnType<typeof listActiveReceivingAccounts>>;
  attempts: Array<{
    id: string;
    status: "SUBMITTED" | "CONFIRMED" | "REJECTED";
    transactionReference: string;
    amountMinor: number;
    paidOn: Date;
    reviewNote: string | null;
    createdAt: Date;
    hasReceipt: boolean;
  }>;
}

/** Everything the payment page needs, in one read. Permission is decided here, not by the page. */
export async function getPaymentOverview(userId: string): Promise<PaymentOverview> {
  const [user, application, fee, accounts, order] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
    db.alumniApplication.findUnique({ where: { userId }, select: { status: true } }),
    getEffectiveRegistrationFee(),
    listActiveReceivingAccounts(),
    db.registrationOrder.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        amountMinor: true,
        currency: true,
        status: true,
        receivingMethod: true,
        receivingTitle: true,
        receivingIdentifier: true,
        receivingAccountId: true,
        createdAt: true,
        attempts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            transactionReference: true,
            amountMinor: true,
            paidOn: true,
            reviewNote: true,
            createdAt: true,
            receiptMediaId: true,
          },
        },
      },
    }),
  ]);

  const emailVerified = Boolean(user?.emailVerified);
  const applicationStatus = application?.status ?? null;
  const isPayable = applicationStatus !== null && (PAYABLE_APPLICATION_STATES as readonly string[]).includes(applicationStatus);

  let blockedReason: string | null = null;
  if (!emailVerified) {
    blockedReason = "Verify your email address before paying.";
  } else if (!isPayable) {
    blockedReason = "Submit your application first. You can pay once it is in the review queue.";
  } else if (accounts.length === 0 && !order) {
    blockedReason = "Payment details are not yet available. The network team will publish the receiving accounts before collections begin.";
  }

  return {
    emailVerified,
    applicationStatus,
    canCreateOrder: blockedReason === null && !order,
    blockedReason,
    feeMinor: fee.amountMinor,
    currency: fee.currency,
    order: order
      ? {
          id: order.id,
          reference: order.reference,
          amountMinor: order.amountMinor,
          currency: order.currency,
          status: order.status,
          receivingMethod: order.receivingMethod,
          receivingTitle: order.receivingTitle,
          receivingIdentifier: order.receivingIdentifier,
          receivingAccountId: order.receivingAccountId,
          createdAt: order.createdAt,
        }
      : null,
    accounts,
    attempts: (order?.attempts ?? []).map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      transactionReference: attempt.transactionReference,
      amountMinor: attempt.amountMinor,
      paidOn: attempt.paidOn,
      reviewNote: attempt.reviewNote,
      createdAt: attempt.createdAt,
      hasReceipt: attempt.receiptMediaId !== null,
    })),
  };
}

/**
 * Creates the one registration order for a member. The fee and the chosen receiving account are copied onto the
 * order and never change afterwards. Repeat calls return the existing order, so a double click cannot create two.
 */
export async function createRegistrationOrder(input: {
  userId: string;
  receivingAccountId: string;
}): Promise<ActionResult<{ orderId: string }>> {
  const overview = await getPaymentOverview(input.userId);
  if (overview.order) {
    return actionOk({ orderId: overview.order.id });
  }
  if (!overview.canCreateOrder) {
    return actionError(overview.blockedReason ?? "Payment is not available for your account yet.");
  }

  const account = overview.accounts.find((candidate) => candidate.id === input.receivingAccountId);
  if (!account) {
    return actionError("Choose one of the receiving accounts shown on this page.");
  }

  const fee = await getEffectiveRegistrationFee();
  try {
    const order = await db.$transaction(async (tx) => {
      const created = await tx.registrationOrder.create({
        data: {
          reference: createOrderReference(),
          userId: input.userId,
          feeScheduleId: fee.feeScheduleId ?? (await ensureDefaultFeeSchedule(tx)),
          amountMinor: fee.amountMinor,
          currency: fee.currency,
          status: "UNPAID",
          receivingAccountId: account.id,
          receivingMethod: account.method,
          receivingTitle: account.accountTitle,
          receivingIdentifier: account.accountIdentifier,
        },
        select: { id: true },
      });
      await recordAudit(tx, {
        action: "registration_order.created",
        entityType: "registration_order",
        entityId: created.id,
        actorId: input.userId,
        metadata: { amountMinor: fee.amountMinor, method: account.method },
      });
      return created;
    });
    return actionOk({ orderId: order.id });
  } catch (error) {
    // A concurrent request created the order first: return it rather than fail.
    const existing = await db.registrationOrder.findFirst({ where: { userId: input.userId }, select: { id: true } });
    if (existing) {
      return actionOk({ orderId: existing.id });
    }
    throw error;
  }
}

/**
 * Orders must reference a fee schedule row. When no schedule has been configured yet, this writes the launch
 * default so the order still records exactly what was quoted.
 */
async function ensureDefaultFeeSchedule(tx: Prisma.TransactionClient): Promise<string> {
  const schedule = await tx.feeSchedule.create({
    data: {
      code: REGISTRATION_FEE_CODE,
      amountMinor: DEFAULT_REGISTRATION_FEE_MINOR,
      currency: "PKR",
      effectiveFrom: new Date(0),
      note: "Launch default recorded automatically because no fee schedule existed.",
    },
    select: { id: true },
  });
  return schedule.id;
}

