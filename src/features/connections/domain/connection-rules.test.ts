import { describe, expect, it } from "vitest";

import {
  canTransitionRequest,
  decideRequestAction,
  deriveConnectionState,
  evaluateSendRequest,
  isActiveConnection,
  type PairRequest,
  type PairSnapshot,
  type SendRequestFacts,
} from "./connection-rules";

const NONE_PAIR: PairSnapshot = { connected: false, blockedByViewer: false, blockedByOther: false, request: null };

function pairWith(overrides: Partial<PairSnapshot>): PairSnapshot {
  return { ...NONE_PAIR, ...overrides };
}

function requestRow(overrides: Partial<PairRequest>): PairRequest {
  return { id: "req-1", status: "PENDING", requesterId: "alice", addresseeId: "bob", ...overrides };
}

function sendFacts(overrides: Partial<SendRequestFacts> = {}): SendRequestFacts {
  return {
    requesterId: "alice",
    addresseeId: "bob",
    requesterActive: true,
    addresseeActive: true,
    pair: NONE_PAIR,
    ...overrides,
  };
}

describe("canTransitionRequest", () => {
  it.each([
    ["PENDING", "ACCEPTED", true],
    ["PENDING", "DECLINED", true],
    ["PENDING", "WITHDRAWN", true],
    ["DECLINED", "PENDING", true],
    ["WITHDRAWN", "PENDING", true],
    ["ACCEPTED", "PENDING", false],
    ["ACCEPTED", "DECLINED", false],
    ["DECLINED", "ACCEPTED", false],
    ["WITHDRAWN", "ACCEPTED", false],
    ["PENDING", "PENDING", false],
  ] as const)("%s -> %s is %s", (from, to, allowed) => {
    expect(canTransitionRequest(from, to)).toBe(allowed);
  });
});

describe("decideRequestAction", () => {
  const pending = requestRow({});

  it("lets only the addressee accept or decline", () => {
    expect(decideRequestAction("ACCEPT", "bob", pending)).toEqual({ ok: true, nextStatus: "ACCEPTED" });
    expect(decideRequestAction("DECLINE", "bob", pending)).toEqual({ ok: true, nextStatus: "DECLINED" });
    expect(decideRequestAction("ACCEPT", "alice", pending)).toEqual({ ok: false, reason: "NOT_PERMITTED" });
    expect(decideRequestAction("DECLINE", "alice", pending)).toEqual({ ok: false, reason: "NOT_PERMITTED" });
  });

  it("lets only the requester withdraw", () => {
    expect(decideRequestAction("WITHDRAW", "alice", pending)).toEqual({ ok: true, nextStatus: "WITHDRAWN" });
    expect(decideRequestAction("WITHDRAW", "bob", pending)).toEqual({ ok: false, reason: "NOT_PERMITTED" });
  });

  it("refuses responses to requests that are no longer pending", () => {
    const declined = requestRow({ status: "DECLINED" });
    expect(decideRequestAction("ACCEPT", "bob", declined)).toEqual({ ok: false, reason: "NOT_PENDING" });
    expect(decideRequestAction("WITHDRAW", "alice", { ...declined })).toEqual({ ok: false, reason: "NOT_PENDING" });
  });
});

describe("evaluateSendRequest", () => {
  it("creates a request when the pair has none", () => {
    expect(evaluateSendRequest(sendFacts())).toEqual({ ok: true, write: "CREATE" });
  });

  it("refuses self-connection before any other check", () => {
    expect(evaluateSendRequest(sendFacts({ addresseeId: "alice" }))).toEqual({ ok: false, reason: "SELF" });
  });

  it("refuses when either member is not an active member", () => {
    expect(evaluateSendRequest(sendFacts({ requesterActive: false }))).toEqual({ ok: false, reason: "INACTIVE" });
    expect(evaluateSendRequest(sendFacts({ addresseeActive: false }))).toEqual({ ok: false, reason: "INACTIVE" });
  });

  it("refuses in both block directions", () => {
    expect(evaluateSendRequest(sendFacts({ pair: pairWith({ blockedByViewer: true }) }))).toEqual({
      ok: false,
      reason: "BLOCKED",
    });
    expect(evaluateSendRequest(sendFacts({ pair: pairWith({ blockedByOther: true }) }))).toEqual({
      ok: false,
      reason: "BLOCKED",
    });
  });

  it("refuses an existing connection", () => {
    expect(evaluateSendRequest(sendFacts({ pair: pairWith({ connected: true }) }))).toEqual({
      ok: false,
      reason: "ALREADY_CONNECTED",
    });
  });

  it("distinguishes a duplicate from a request waiting on the viewer", () => {
    const outgoing = pairWith({ request: requestRow({ requesterId: "alice", addresseeId: "bob" }) });
    const incoming = pairWith({ request: requestRow({ requesterId: "bob", addresseeId: "alice" }) });
    expect(evaluateSendRequest(sendFacts({ pair: outgoing }))).toEqual({ ok: false, reason: "ALREADY_SENT" });
    expect(evaluateSendRequest(sendFacts({ pair: incoming }))).toEqual({
      ok: false,
      reason: "RECEIVED_FROM_OTHER",
    });
  });

  it("reuses the pair row after a decline or withdrawal", () => {
    expect(
      evaluateSendRequest(sendFacts({ pair: pairWith({ request: requestRow({ status: "DECLINED" }) }) })),
    ).toEqual({ ok: true, write: "REOPEN" });
    expect(
      evaluateSendRequest(sendFacts({ pair: pairWith({ request: requestRow({ status: "WITHDRAWN" }) }) })),
    ).toEqual({ ok: true, write: "REOPEN" });
  });

  it("treats a stale accepted request as already connected", () => {
    expect(
      evaluateSendRequest(sendFacts({ pair: pairWith({ request: requestRow({ status: "ACCEPTED" }) }) })),
    ).toEqual({ ok: false, reason: "ALREADY_CONNECTED" });
  });
});

describe("deriveConnectionState", () => {
  it("reports SELF for the same member", () => {
    expect(deriveConnectionState("alice", "alice", NONE_PAIR)).toBe("SELF");
  });

  it("reports NONE when there is no relationship", () => {
    expect(deriveConnectionState("alice", "bob", NONE_PAIR)).toBe("NONE");
  });

  it("distinguishes outgoing and incoming pending requests", () => {
    const outgoing = pairWith({ request: requestRow({ requesterId: "alice" }) });
    const incoming = pairWith({ request: requestRow({ requesterId: "bob" }) });
    expect(deriveConnectionState("alice", "bob", outgoing)).toBe("PENDING_OUTGOING");
    expect(deriveConnectionState("alice", "bob", incoming)).toBe("PENDING_INCOMING");
  });

  it("ignores declined and withdrawn requests", () => {
    const declined = pairWith({ request: requestRow({ status: "DECLINED" }) });
    expect(deriveConnectionState("alice", "bob", declined)).toBe("NONE");
  });

  it("reports CONNECTED for an accepted connection without a block", () => {
    expect(deriveConnectionState("alice", "bob", pairWith({ connected: true }))).toBe("CONNECTED");
  });

  it("gives block states precedence over connection and requests", () => {
    const blockedByViewer = pairWith({ connected: true, blockedByViewer: true, blockedByOther: true });
    expect(deriveConnectionState("alice", "bob", blockedByViewer)).toBe("BLOCKED_BY_VIEWER");

    const blockedByOther = pairWith({
      connected: true,
      blockedByOther: true,
      request: requestRow({ requesterId: "alice" }),
    });
    expect(deriveConnectionState("alice", "bob", blockedByOther)).toBe("BLOCKED_BY_OTHER");
  });
});

describe("isActiveConnection", () => {
  it("requires a connection and no block in either direction", () => {
    expect(isActiveConnection(pairWith({ connected: true }))).toBe(true);
    expect(isActiveConnection(pairWith({}))).toBe(false);
    expect(isActiveConnection(pairWith({ connected: true, blockedByViewer: true }))).toBe(false);
    expect(isActiveConnection(pairWith({ connected: true, blockedByOther: true }))).toBe(false);
  });
});
