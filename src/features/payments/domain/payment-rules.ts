/**
 * Rules for manual payment evidence. A submitted attempt is only evidence: it never marks an order as paid.
 * A finance reviewer confirms each transfer against the receiving-account statement.
 */

import { normalizeTransactionReference } from "@/lib/ids";

export const PAYMENT_METHODS = ["BANK_TRANSFER", "EASYPAISA", "JAZZCASH"] as const;
export type ManualPaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<ManualPaymentMethod, string> = {
  BANK_TRANSFER: "Bank transfer",
  EASYPAISA: "Easypaisa transfer",
  JAZZCASH: "JazzCash transfer",
};

/** Transfers older than this are refused: the reviewer cannot reconcile a very old statement line reliably. */
export const MAX_PAYMENT_AGE_DAYS = 90;

/** A quoted transfer reference after normalization must have a plausible length to be checked. */
const MIN_REFERENCE_LENGTH = 6;
const MAX_REFERENCE_LENGTH = 40;

export interface ReferenceCheck {
  ok: boolean;
  normalized: string;
  message?: string;
}

export function checkTransactionReference(raw: string): ReferenceCheck {
  const normalized = normalizeTransactionReference(raw);
  if (normalized.length < MIN_REFERENCE_LENGTH) {
    return {
      ok: false,
      normalized,
      message: `The transaction reference must have at least ${MIN_REFERENCE_LENGTH} letters or numbers.`,
    };
  }
  if (normalized.length > MAX_REFERENCE_LENGTH) {
    return { ok: false, normalized, message: "The transaction reference is too long." };
  }
  return { ok: true, normalized };
}

/** The amount paid must equal the fee quoted on the order. Partial or excess payments are reconciled outside the platform. */
export function amountMatchesOrder(paidMinor: number, orderMinor: number): boolean {
  return Number.isInteger(paidMinor) && paidMinor === orderMinor;
}

/**
 * Accepts a payment date that is not in the future and not older than MAX_PAYMENT_AGE_DAYS.
 * Dates are compared as calendar days so that a same-day transfer is never rejected by time-of-day alone.
 */
export function checkPaymentDate(paidOn: Date, now: Date): { ok: boolean; message?: string } {
  const day = (value: Date) => Math.floor(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / 86_400_000);
  const today = day(now);
  const paid = day(paidOn);
  if (paid > today) {
    return { ok: false, message: "The payment date cannot be in the future." };
  }
  if (today - paid > MAX_PAYMENT_AGE_DAYS) {
    return { ok: false, message: `Payments older than ${MAX_PAYMENT_AGE_DAYS} days cannot be submitted online. Contact the network team.` };
  }
  return { ok: true };
}

/** A receipt number that is unique and not guessable, printed on the receipt for reconciliation. */
export function receiptNumberFor(now: Date, randomSuffix: string): string {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `RCPT-${stamp}-${randomSuffix}`;
}
