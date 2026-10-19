import { describe, expect, it } from "vitest";

import { parseFeedCursor } from "./feed-cursor";

describe("parseFeedCursor", () => {
  it("parses a canonical UTC timestamp", () => {
    expect(parseFeedCursor("2026-10-01T08:30:00.000Z")?.toISOString()).toBe("2026-10-01T08:30:00.000Z");
    expect(parseFeedCursor("2026-10-01T08:30:00Z")?.toISOString()).toBe("2026-10-01T08:30:00.000Z");
  });

  it("rejects missing, malformed and non-UTC values", () => {
    expect(parseFeedCursor(undefined)).toBeNull();
    expect(parseFeedCursor("")).toBeNull();
    expect(parseFeedCursor("not a date")).toBeNull();
    expect(parseFeedCursor("2026-10-01T08:30:00+05:00")).toBeNull();
    expect(parseFeedCursor("2026-13-45T08:30:00Z")).toBeNull();
  });
});
