import { describe, expect, it } from "vitest";

import {
  assertApplicationTransition,
  assertMembershipTransition,
  assertRefundTransition,
  canTransitionApplication,
  canTransitionAttempt,
  canTransitionMembership,
  canTransitionOrder,
  canTransitionRefund,
  InvalidTransitionError,
} from "./state-machines";

describe("application transitions", () => {
  it("allows the applicant to submit and staff to decide", () => {
    expect(canTransitionApplication("DRAFT", "SUBMITTED")).toBe(true);
    expect(canTransitionApplication("SUBMITTED", "APPROVED")).toBe(true);
    expect(canTransitionApplication("CHANGES_REQUESTED", "SUBMITTED")).toBe(true);
  });

  it("never lets an approved or rejected application move back", () => {
    expect(canTransitionApplication("APPROVED", "REJECTED")).toBe(false);
    expect(canTransitionApplication("REJECTED", "APPROVED")).toBe(false);
  });

  it("throws a typed error for an illegal move", () => {
    expect(() => assertApplicationTransition("DRAFT", "APPROVED")).toThrow(InvalidTransitionError);
  });
});

describe("order and attempt transitions", () => {
  it("moves an order to awaiting review and back when evidence is rejected", () => {
    expect(canTransitionOrder("UNPAID", "AWAITING_REVIEW")).toBe(true);
    expect(canTransitionOrder("AWAITING_REVIEW", "UNPAID")).toBe(true);
    expect(canTransitionOrder("AWAITING_REVIEW", "CONFIRMED")).toBe(true);
  });

  it("never marks an order paid without going through review", () => {
    expect(canTransitionOrder("UNPAID", "CONFIRMED")).toBe(false);
  });

  it("treats confirmed and rejected attempts as final", () => {
    expect(canTransitionAttempt("CONFIRMED", "REJECTED")).toBe(false);
    expect(canTransitionAttempt("REJECTED", "CONFIRMED")).toBe(false);
    expect(canTransitionAttempt("SUBMITTED", "CONFIRMED")).toBe(true);
  });
});

describe("refund transitions", () => {
  it("requires approval before processing and allows a retry after failure", () => {
    expect(canTransitionRefund("REQUESTED", "PROCESSED")).toBe(false);
    expect(canTransitionRefund("APPROVED", "PROCESSED")).toBe(true);
    expect(canTransitionRefund("APPROVED", "FAILED")).toBe(true);
    expect(canTransitionRefund("FAILED", "APPROVED")).toBe(true);
  });

  it("does not allow a processed refund to be reopened", () => {
    expect(canTransitionRefund("PROCESSED", "APPROVED")).toBe(false);
    expect(() => assertRefundTransition("PROCESSED", "APPROVED")).toThrow(InvalidTransitionError);
  });
});

describe("membership transitions", () => {
  it("activates only from pending, and suspends or closes from active", () => {
    expect(canTransitionMembership("PENDING", "ACTIVE")).toBe(true);
    expect(canTransitionMembership("ACTIVE", "SUSPENDED")).toBe(true);
    expect(canTransitionMembership("ACTIVE", "CLOSED")).toBe(true);
  });

  it("cannot suspend a pending membership, because a refund on it has nothing to suspend", () => {
    expect(canTransitionMembership("PENDING", "SUSPENDED")).toBe(false);
  });

  it("keeps closed memberships closed", () => {
    expect(canTransitionMembership("CLOSED", "ACTIVE")).toBe(false);
    expect(() => assertMembershipTransition("CLOSED", "ACTIVE")).toThrow(InvalidTransitionError);
  });
});
