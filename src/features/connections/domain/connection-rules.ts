/**
 * Connection rules: request lifecycle, send/respond decisions and the state a viewer sees for another member.
 * Pure module with no framework or database imports, so every rule is testable in isolation.
 *
 * A pair has at most one ConnectionRequest row (pairKey is unique). A declined or withdrawn request reuses that
 * row when someone sends a new one. Removing an accepted connection deletes both the Connection and the request
 * row, so ACCEPTED is terminal here.
 */

export type ConnectionRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";

/** What a viewer may see about their relationship with another member. BLOCKED_BY_OTHER must never be shown as such. */
export type ConnectionViewState =
  | "SELF"
  | "NONE"
  | "PENDING_OUTGOING"
  | "PENDING_INCOMING"
  | "CONNECTED"
  | "BLOCKED_BY_VIEWER"
  | "BLOCKED_BY_OTHER";

export const CONNECTION_NOTE_MAX_LENGTH = 300;

export interface PairRequest {
  id: string;
  status: ConnectionRequestStatus;
  requesterId: string;
  addresseeId: string;
}

/** Everything the rules need to know about one pair of members, read from the database in one place. */
export interface PairSnapshot {
  /** A Connection row exists for the pair (it may still be inactive because of a block). */
  connected: boolean;
  /** The viewer has blocked the other member. */
  blockedByViewer: boolean;
  /** The other member has blocked the viewer. */
  blockedByOther: boolean;
  request: PairRequest | null;
}

const REQUEST_TRANSITIONS: Readonly<Record<ConnectionRequestStatus, readonly ConnectionRequestStatus[]>> = {
  PENDING: ["ACCEPTED", "DECLINED", "WITHDRAWN"],
  DECLINED: ["PENDING"],
  WITHDRAWN: ["PENDING"],
  ACCEPTED: [],
};

export function canTransitionRequest(from: ConnectionRequestStatus, to: ConnectionRequestStatus): boolean {
  return REQUEST_TRANSITIONS[from].includes(to);
}

export type RequestAction = "ACCEPT" | "DECLINE" | "WITHDRAW";

const REQUEST_ACTION_TARGET: Readonly<Record<RequestAction, ConnectionRequestStatus>> = {
  ACCEPT: "ACCEPTED",
  DECLINE: "DECLINED",
  WITHDRAW: "WITHDRAWN",
};

export type RequestActionDecision =
  | { ok: true; nextStatus: ConnectionRequestStatus }
  | { ok: false; reason: "NOT_PERMITTED" | "NOT_PENDING" };

/** Accept and decline belong to the addressee; withdraw belongs to the requester. */
export function decideRequestAction(
  action: RequestAction,
  actorId: string,
  request: Pick<PairRequest, "requesterId" | "addresseeId" | "status">,
): RequestActionDecision {
  const requiredActor = action === "WITHDRAW" ? request.requesterId : request.addresseeId;
  if (actorId !== requiredActor) {
    return { ok: false, reason: "NOT_PERMITTED" };
  }
  const nextStatus = REQUEST_ACTION_TARGET[action];
  if (!canTransitionRequest(request.status, nextStatus)) {
    return { ok: false, reason: "NOT_PENDING" };
  }
  return { ok: true, nextStatus };
}

export type SendRequestDenial =
  | "SELF"
  | "INACTIVE"
  | "BLOCKED"
  | "ALREADY_CONNECTED"
  | "ALREADY_SENT"
  | "RECEIVED_FROM_OTHER";

export interface SendRequestFacts {
  requesterId: string;
  addresseeId: string;
  requesterActive: boolean;
  addresseeActive: boolean;
  pair: PairSnapshot;
}

export type SendRequestDecision =
  | { ok: true; write: "CREATE" | "REOPEN" }
  | { ok: false; reason: SendRequestDenial };

export function isBlockedPair(pair: PairSnapshot): boolean {
  return pair.blockedByViewer || pair.blockedByOther;
}

/** A connection counts for visibility and messaging only while neither member has blocked the other. */
export function isActiveConnection(pair: PairSnapshot): boolean {
  return pair.connected && !isBlockedPair(pair);
}

export function evaluateSendRequest(facts: SendRequestFacts): SendRequestDecision {
  if (facts.requesterId === facts.addresseeId) {
    return { ok: false, reason: "SELF" };
  }
  if (!facts.requesterActive || !facts.addresseeActive) {
    return { ok: false, reason: "INACTIVE" };
  }
  if (isBlockedPair(facts.pair)) {
    return { ok: false, reason: "BLOCKED" };
  }
  if (facts.pair.connected) {
    return { ok: false, reason: "ALREADY_CONNECTED" };
  }

  const request = facts.pair.request;
  if (!request) {
    return { ok: true, write: "CREATE" };
  }
  if (request.status === "PENDING") {
    const reason = request.requesterId === facts.requesterId ? "ALREADY_SENT" : "RECEIVED_FROM_OTHER";
    return { ok: false, reason };
  }
  if (request.status === "ACCEPTED") {
    return { ok: false, reason: "ALREADY_CONNECTED" };
  }
  // DECLINED or WITHDRAWN: the pair's row is reused for the new request.
  return { ok: true, write: "REOPEN" };
}

/** The state shown to `viewerId` about `otherId`. Block states take precedence over every other relationship. */
export function deriveConnectionState(viewerId: string, otherId: string, pair: PairSnapshot): ConnectionViewState {
  if (viewerId === otherId) {
    return "SELF";
  }
  if (pair.blockedByViewer) {
    return "BLOCKED_BY_VIEWER";
  }
  if (pair.blockedByOther) {
    return "BLOCKED_BY_OTHER";
  }
  if (pair.connected) {
    return "CONNECTED";
  }
  if (pair.request?.status === "PENDING") {
    return pair.request.requesterId === viewerId ? "PENDING_OUTGOING" : "PENDING_INCOMING";
  }
  return "NONE";
}
