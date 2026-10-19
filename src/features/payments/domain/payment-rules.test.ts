import { describe, expect, it } from "vitest";

import {
  amountMatchesOrder,
  checkPaymentDate,
  checkTransactionReference,
  MAX_PAYMENT_AGE_DAYS,
  receiptNumberFor,
} from "./payment-rules";

describe("transaction references", () => {
  it("normalizes case, spaces and punctuation before comparing", () => {
    expect(checkTransactionReference(" tx-88 21 9 ")).toEqual({ ok: true, normalized: "TX88219" });
  });

  it("rejects references that are too short to reconcile", () => {
    expect(checkTransactionReference("AB12").ok).toBe(false);
  });
});

describe("amount matching", () => {
  it("requires the paid amount to equal the order fee exactly", () => {
    expect(amountMatchesOrder(50_000, 50_000)).toBe(true);
    expect(amountMatchesOrder(49_900, 50_000)).toBe(false);
    expect(amountMatchesOrder(50_100, 50_000)).toBe(false);
  });
});

describe("payment dates", () => {
  const now = new Date("2026-10-19T10:00:00.000Z");

  it("accepts a transfer made today", () => {
    expect(checkPaymentDate(new Date("2026-10-19T00:00:00.000Z"), now).ok).toBe(true);
  });

  it("rejects a transfer dated in the future", () => {
    expect(checkPaymentDate(new Date("2026-10-20T00:00:00.000Z"), now).ok).toBe(false);
  });

  it("rejects transfers older than the limit", () => {
    const old = new Date(now.getTime() - (MAX_PAYMENT_AGE_DAYS + 2) * 86_400_000);
    expect(checkPaymentDate(old, now).ok).toBe(false);
  });
});

describe("receipt numbers", () => {
  it("includes the date and the suffix that was supplied", () => {
    expect(receiptNumberFor(new Date("2026-10-19T10:00:00.000Z"), "AB12CD34")).toBe("RCPT-20261019-AB12CD34");
  });
});
