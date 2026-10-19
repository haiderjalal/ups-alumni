/**
 * Membership activation rules. A member becomes ACTIVE only when every fact below holds.
 * An approved application or a receipt upload alone never grants access.
 */

export interface EligibilityFacts {
  /** Better Auth `user.emailVerified`. */
  emailVerified: boolean;
  /** Required profile fields are complete and valid (see registration/domain/completeness.ts). */
  applicationComplete: boolean;
  /** The alumni application has been approved by an authorized reviewer. */
  applicationApproved: boolean;
  /** A ConfirmedPayment exists for the registration order. Submitted receipts do not count. */
  feeConfirmed: boolean;
  /** An approved or processed refund exists. Access must not be restored while one is open. */
  refundBlocksAccess: boolean;
}

export type EligibilityGap =
  | "EMAIL_NOT_VERIFIED"
  | "PROFILE_INCOMPLETE"
  | "APPLICATION_NOT_APPROVED"
  | "FEE_NOT_CONFIRMED"
  | "REFUND_BLOCKS_ACCESS";

export interface EligibilityResult {
  eligible: boolean;
  gaps: EligibilityGap[];
}

export function evaluateEligibility(facts: EligibilityFacts): EligibilityResult {
  const gaps: EligibilityGap[] = [];

  if (!facts.emailVerified) gaps.push("EMAIL_NOT_VERIFIED");
  if (!facts.applicationComplete) gaps.push("PROFILE_INCOMPLETE");
  if (!facts.applicationApproved) gaps.push("APPLICATION_NOT_APPROVED");
  if (!facts.feeConfirmed) gaps.push("FEE_NOT_CONFIRMED");
  if (facts.refundBlocksAccess) gaps.push("REFUND_BLOCKS_ACCESS");

  return { eligible: gaps.length === 0, gaps };
}

/** Human-readable explanations for the member status page. Keep wording plain and non-technical. */
export const ELIGIBILITY_GAP_MESSAGES: Record<EligibilityGap, string> = {
  EMAIL_NOT_VERIFIED: "Verify your email address.",
  PROFILE_INCOMPLETE: "Complete the required fields in your alumni application.",
  APPLICATION_NOT_APPROVED: "Your application is waiting for alumni review.",
  FEE_NOT_CONFIRMED: "The Rs. 500 registration fee has not been confirmed yet.",
  REFUND_BLOCKS_ACCESS: "A refund is open on this registration, so access is paused.",
};
