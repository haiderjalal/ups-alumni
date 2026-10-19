import { describe, expect, it } from "vitest";

import { decideRsvp, effectiveRsvpDeadline, rsvpPrompt, selectPromotions } from "./rsvp-rules";

const DEADLINE = new Date("2026-11-05T13:00:00.000Z");
const BEFORE = new Date("2026-11-05T12:00:00.000Z");
const AFTER = new Date("2026-11-05T13:00:01.000Z");

describe("rsvpPrompt", () => {
  const open = { eventOpen: true, capacity: 10, goingCount: 3, deadline: DEADLINE, now: BEFORE };

  it("offers cancellation to anyone with a registration", () => {
    expect(rsvpPrompt({ ...open, viewerStatus: "GOING" })).toBe("CANCEL");
    expect(rsvpPrompt({ ...open, viewerStatus: "WAITLISTED", goingCount: 10 })).toBe("CANCEL");
    expect(rsvpPrompt({ ...open, viewerStatus: "GOING", now: AFTER })).toBe("CANCEL");
  });

  it("offers a seat while one is free and the waitlist when full", () => {
    expect(rsvpPrompt({ ...open, viewerStatus: null })).toBe("JOIN");
    expect(rsvpPrompt({ ...open, viewerStatus: null, goingCount: 10 })).toBe("JOIN_WAITLIST");
  });

  it("reports closed registration after the deadline", () => {
    expect(rsvpPrompt({ ...open, viewerStatus: null, now: AFTER })).toBe("CLOSED");
  });

  it("reports unavailable for events that are not open to the viewer", () => {
    expect(rsvpPrompt({ ...open, eventOpen: false, viewerStatus: null })).toBe("UNAVAILABLE");
  });
});

describe("decideRsvp", () => {
  it("grants a seat while the event has room", () => {
    expect(decideRsvp({ capacity: 10, goingCount: 9, deadline: DEADLINE, now: BEFORE })).toEqual({ outcome: "GOING" });
  });

  it("waitlists the member once capacity is reached", () => {
    expect(decideRsvp({ capacity: 10, goingCount: 10, deadline: DEADLINE, now: BEFORE })).toEqual({
      outcome: "WAITLIST",
    });
  });

  it("waitlists when the going count exceeds a lowered capacity", () => {
    expect(decideRsvp({ capacity: 5, goingCount: 8, deadline: DEADLINE, now: BEFORE })).toEqual({ outcome: "WAITLIST" });
  });

  it("treats null capacity as unlimited", () => {
    expect(decideRsvp({ capacity: null, goingCount: 10_000, deadline: DEADLINE, now: BEFORE })).toEqual({
      outcome: "GOING",
    });
  });

  it("still accepts an RSVP exactly at the deadline", () => {
    expect(decideRsvp({ capacity: null, goingCount: 0, deadline: DEADLINE, now: DEADLINE })).toEqual({
      outcome: "GOING",
    });
  });

  it("refuses an RSVP after the deadline even when seats are free", () => {
    expect(decideRsvp({ capacity: 10, goingCount: 0, deadline: DEADLINE, now: AFTER })).toEqual({
      outcome: "REJECT",
      reason: "DEADLINE_PASSED",
    });
  });

  it("reports the deadline before waitlisting when both would apply", () => {
    expect(decideRsvp({ capacity: 1, goingCount: 1, deadline: DEADLINE, now: AFTER })).toEqual({
      outcome: "REJECT",
      reason: "DEADLINE_PASSED",
    });
  });
});

describe("effectiveRsvpDeadline", () => {
  it("uses the explicit deadline when one is set", () => {
    expect(effectiveRsvpDeadline(DEADLINE, new Date("2026-11-06T00:00:00.000Z"))).toEqual(DEADLINE);
  });

  it("falls back to the start time when no deadline is set", () => {
    const startsAt = new Date("2026-11-06T00:00:00.000Z");
    expect(effectiveRsvpDeadline(null, startsAt)).toEqual(startsAt);
  });
});

describe("selectPromotions", () => {
  const queue = ["u1", "u2", "u3"];

  it("promotes the earliest waitlisted members for each freed seat", () => {
    expect(selectPromotions({ capacity: 10, goingCount: 9, queue })).toEqual(["u1"]);
    expect(selectPromotions({ capacity: 10, goingCount: 8, queue })).toEqual(["u1", "u2"]);
  });

  it("promotes nobody when the event is still full", () => {
    expect(selectPromotions({ capacity: 10, goingCount: 10, queue })).toEqual([]);
  });

  it("never exceeds capacity after an organizer lowers it", () => {
    expect(selectPromotions({ capacity: 5, goingCount: 8, queue })).toEqual([]);
  });

  it("promotes everyone when capacity becomes unlimited", () => {
    expect(selectPromotions({ capacity: null, goingCount: 2, queue })).toEqual(queue);
  });

  it("returns an empty list for an empty queue", () => {
    expect(selectPromotions({ capacity: 10, goingCount: 0, queue: [] })).toEqual([]);
  });
});
