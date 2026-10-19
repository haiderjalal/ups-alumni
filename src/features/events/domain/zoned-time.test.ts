import { describe, expect, it } from "vitest";

import { isValidTimeZone, zonedLocalToUtc } from "./zoned-time";

describe("zonedLocalToUtc", () => {
  it("converts Asia/Karachi wall-clock time (UTC+5, no DST) to UTC", () => {
    expect(zonedLocalToUtc("2026-11-05T18:00", "Asia/Karachi")?.toISOString()).toBe("2026-11-05T13:00:00.000Z");
  });

  it("accepts times with seconds", () => {
    expect(zonedLocalToUtc("2026-11-05T18:00:30", "Asia/Karachi")?.toISOString()).toBe("2026-11-05T13:00:30.000Z");
  });

  it("applies daylight saving time where the zone observes it", () => {
    expect(zonedLocalToUtc("2026-07-01T12:00", "America/New_York")?.toISOString()).toBe("2026-07-01T16:00:00.000Z");
    expect(zonedLocalToUtc("2026-01-15T12:00", "America/New_York")?.toISOString()).toBe("2026-01-15T17:00:00.000Z");
  });

  it("treats UTC as an identity conversion", () => {
    expect(zonedLocalToUtc("2026-03-10T09:30", "UTC")?.toISOString()).toBe("2026-03-10T09:30:00.000Z");
  });

  it("crosses the date boundary correctly for early-morning local times", () => {
    expect(zonedLocalToUtc("2026-11-05T02:00", "Asia/Karachi")?.toISOString()).toBe("2026-11-04T21:00:00.000Z");
  });

  it("rejects malformed text", () => {
    expect(zonedLocalToUtc("05/11/2026 18:00", "Asia/Karachi")).toBeNull();
    expect(zonedLocalToUtc("", "Asia/Karachi")).toBeNull();
  });

  it("rejects impossible calendar dates and times", () => {
    expect(zonedLocalToUtc("2026-02-30T10:00", "Asia/Karachi")).toBeNull();
    expect(zonedLocalToUtc("2026-13-01T10:00", "Asia/Karachi")).toBeNull();
    expect(zonedLocalToUtc("2026-11-05T24:00", "Asia/Karachi")).toBeNull();
  });

  it("returns null for an unknown zone", () => {
    expect(zonedLocalToUtc("2026-11-05T18:00", "Mars/Olympus")).toBeNull();
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA names and rejects unknown ones", () => {
    expect(isValidTimeZone("Asia/Karachi")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});
