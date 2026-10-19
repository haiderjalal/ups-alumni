import { describe, expect, it } from "vitest";

import { resolveEventSchedule } from "./event-schedule";

const BASE = {
  startsAtLocal: "2026-11-05T18:00",
  endsAtLocal: "2026-11-05T20:00",
  rsvpDeadlineLocal: null,
  timezone: "Asia/Karachi",
};

describe("resolveEventSchedule", () => {
  it("converts every time to UTC", () => {
    const result = resolveEventSchedule({ ...BASE, rsvpDeadlineLocal: "2026-11-04T23:59" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.schedule.startsAt.toISOString()).toBe("2026-11-05T13:00:00.000Z");
    expect(result.schedule.endsAt?.toISOString()).toBe("2026-11-05T15:00:00.000Z");
    expect(result.schedule.rsvpDeadline?.toISOString()).toBe("2026-11-04T18:59:00.000Z");
  });

  it("allows an open-ended event with no end or deadline", () => {
    const result = resolveEventSchedule({ ...BASE, endsAtLocal: null });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schedule.endsAt).toBeNull();
      expect(result.schedule.rsvpDeadline).toBeNull();
    }
  });

  it("rejects an invalid start", () => {
    expect(resolveEventSchedule({ ...BASE, startsAtLocal: "2026-02-31T10:00" })).toEqual({
      ok: false,
      fieldErrors: { startsAtLocal: "Enter a valid start date and time." },
    });
  });

  it("rejects an end that is not after the start", () => {
    const result = resolveEventSchedule({ ...BASE, endsAtLocal: "2026-11-05T18:00" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.endsAtLocal).toBe("The end time must be after the start time.");
    }
  });

  it("rejects an unparseable deadline", () => {
    const result = resolveEventSchedule({ ...BASE, rsvpDeadlineLocal: "tomorrow" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.rsvpDeadlineLocal).toBe("Enter a valid RSVP deadline.");
    }
  });
});
