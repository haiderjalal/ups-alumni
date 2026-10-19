import { describe, expect, it } from "vitest";

import { evaluateEligibility, type EligibilityFacts } from "./eligibility";

const COMPLETE: EligibilityFacts = {
  emailVerified: true,
  applicationComplete: true,
  applicationApproved: true,
  feeConfirmed: true,
  refundBlocksAccess: false,
};

describe("evaluateEligibility", () => {
  it("is eligible only when every fact holds", () => {
    expect(evaluateEligibility(COMPLETE)).toEqual({ eligible: true, gaps: [] });
  });

  it("names each missing requirement separately", () => {
    const result = evaluateEligibility({ ...COMPLETE, emailVerified: false, feeConfirmed: false });
    expect(result.eligible).toBe(false);
    expect(result.gaps).toEqual(["EMAIL_NOT_VERIFIED", "FEE_NOT_CONFIRMED"]);
  });

  it("does not treat an approval alone as enough without a confirmed fee", () => {
    const result = evaluateEligibility({ ...COMPLETE, feeConfirmed: false });
    expect(result.eligible).toBe(false);
    expect(result.gaps).toContain("FEE_NOT_CONFIRMED");
  });

  it("does not treat a confirmed fee alone as enough without an approved application", () => {
    const result = evaluateEligibility({ ...COMPLETE, applicationApproved: false });
    expect(result.gaps).toEqual(["APPLICATION_NOT_APPROVED"]);
  });

  it("blocks access while a refund is open, even when everything else is complete", () => {
    const result = evaluateEligibility({ ...COMPLETE, refundBlocksAccess: true });
    expect(result).toEqual({ eligible: false, gaps: ["REFUND_BLOCKS_ACCESS"] });
  });
});
