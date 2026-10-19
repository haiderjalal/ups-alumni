/**
 * Permitted transitions for every state that the platform tracks. This module is pure: it has no
 * database or framework imports, so the rules can be tested in isolation. Services must call
 * `assertTransition` before writing a new status. See docs/state-machines.md.
 */

export type ApplicationState =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export type OrderState = "UNPAID" | "AWAITING_REVIEW" | "CONFIRMED" | "REFUNDED";

export type AttemptState = "SUBMITTED" | "CONFIRMED" | "REJECTED";

export type RefundState = "REQUESTED" | "APPROVED" | "PROCESSED" | "FAILED" | "REJECTED";

export type MembershipState = "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";

type TransitionTable<State extends string> = Readonly<Record<State, readonly State[]>>;

const APPLICATION_TRANSITIONS: TransitionTable<ApplicationState> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["CHANGES_REQUESTED", "APPROVED", "REJECTED"],
  CHANGES_REQUESTED: ["SUBMITTED"],
  APPROVED: [],
  REJECTED: [],
};

const ORDER_TRANSITIONS: TransitionTable<OrderState> = {
  UNPAID: ["AWAITING_REVIEW"],
  AWAITING_REVIEW: ["UNPAID", "CONFIRMED"],
  CONFIRMED: ["REFUNDED"],
  REFUNDED: [],
};

const ATTEMPT_TRANSITIONS: TransitionTable<AttemptState> = {
  SUBMITTED: ["CONFIRMED", "REJECTED"],
  CONFIRMED: [],
  REJECTED: [],
};

const REFUND_TRANSITIONS: TransitionTable<RefundState> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSED", "FAILED"],
  FAILED: ["APPROVED"],
  PROCESSED: [],
  REJECTED: [],
};

/**
 * PENDING -> ACTIVE happens only through eligibility. SUSPENDED -> ACTIVE is a deliberate staff
 * reinstatement, and only when no refund is open (see eligibility.ts). A refund approval suspends
 * the membership, and a processed full refund closes it.
 */
const MEMBERSHIP_TRANSITIONS: TransitionTable<MembershipState> = {
  PENDING: ["ACTIVE", "CLOSED"],
  ACTIVE: ["SUSPENDED", "CLOSED"],
  SUSPENDED: ["ACTIVE", "CLOSED"],
  CLOSED: [],
};

function canTransition<State extends string>(
  table: TransitionTable<State>,
  from: State,
  to: State,
): boolean {
  return table[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly entity: string,
    readonly from: string,
    readonly to: string,
  ) {
    super(`${entity} cannot move from ${from} to ${to}.`);
    this.name = "InvalidTransitionError";
  }
}

function assertTransition<State extends string>(
  entity: string,
  table: TransitionTable<State>,
  from: State,
  to: State,
): void {
  if (!canTransition(table, from, to)) {
    throw new InvalidTransitionError(entity, from, to);
  }
}

export const canTransitionApplication = (from: ApplicationState, to: ApplicationState) =>
  canTransition(APPLICATION_TRANSITIONS, from, to);
export const assertApplicationTransition = (from: ApplicationState, to: ApplicationState) =>
  assertTransition("Application", APPLICATION_TRANSITIONS, from, to);

export const canTransitionOrder = (from: OrderState, to: OrderState) => canTransition(ORDER_TRANSITIONS, from, to);
export const assertOrderTransition = (from: OrderState, to: OrderState) =>
  assertTransition("Registration order", ORDER_TRANSITIONS, from, to);

export const canTransitionAttempt = (from: AttemptState, to: AttemptState) =>
  canTransition(ATTEMPT_TRANSITIONS, from, to);
export const assertAttemptTransition = (from: AttemptState, to: AttemptState) =>
  assertTransition("Payment attempt", ATTEMPT_TRANSITIONS, from, to);

export const canTransitionRefund = (from: RefundState, to: RefundState) => canTransition(REFUND_TRANSITIONS, from, to);
export const assertRefundTransition = (from: RefundState, to: RefundState) =>
  assertTransition("Refund", REFUND_TRANSITIONS, from, to);

export const canTransitionMembership = (from: MembershipState, to: MembershipState) =>
  canTransition(MEMBERSHIP_TRANSITIONS, from, to);
export const assertMembershipTransition = (from: MembershipState, to: MembershipState) =>
  assertTransition("Membership", MEMBERSHIP_TRANSITIONS, from, to);
