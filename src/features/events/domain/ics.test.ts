import { describe, expect, it } from "vitest";

import { buildEventIcs, escapeIcsText, foldIcsLine, formatIcsUtc } from "./ics";

function unfold(text: string): string {
  return text.replace(/\r\n /g, "");
}

describe("escapeIcsText", () => {
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeIcsText("Dinner, drinks; a\\b\nnext")).toBe("Dinner\\, drinks\\; a\\\\b\\nnext");
  });

  it("escapes a backslash only once, before other escapes are added", () => {
    expect(escapeIcsText("\\,")).toBe("\\\\\\,");
  });

  it("normalizes CRLF and CR line breaks to a single escaped newline", () => {
    expect(escapeIcsText("a\r\nb\rc")).toBe("a\\nb\\nc");
  });

  it("leaves plain text and non-ASCII letters unchanged", () => {
    expect(escapeIcsText("Alumni reunion 2026")).toBe("Alumni reunion 2026");
    expect(escapeIcsText("یونیورسٹی")).toBe("یونیورسٹی");
  });
});

describe("foldIcsLine", () => {
  it("leaves short lines untouched", () => {
    expect(foldIcsLine("SUMMARY:Reunion")).toBe("SUMMARY:Reunion");
  });

  it("folds long ASCII lines so each physical line is at most 75 octets", () => {
    const folded = foldIcsLine(`DESCRIPTION:${"x".repeat(200)}`);
    const physicalLines = folded.split("\r\n");
    for (const physical of physicalLines) {
      expect(Buffer.byteLength(physical, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(physicalLines[1].startsWith(" ")).toBe(true);
    expect(unfold(folded)).toBe(`DESCRIPTION:${"x".repeat(200)}`);
  });

  it("never splits a multi-byte character across lines", () => {
    const value = `SUMMARY:${"ی".repeat(80)}`;
    const folded = foldIcsLine(value);
    for (const physical of folded.split("\r\n")) {
      expect(Buffer.byteLength(physical, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(unfold(folded)).toBe(value);
  });
});

describe("formatIcsUtc", () => {
  it("writes the UTC basic format", () => {
    expect(formatIcsUtc(new Date("2026-11-05T13:00:00.000Z"))).toBe("20261105T130000Z");
  });
});

describe("buildEventIcs", () => {
  const base = {
    uid: "evt_123@ups-alumni",
    stamp: new Date("2026-10-01T08:00:00.000Z"),
    startsAt: new Date("2026-11-05T13:00:00.000Z"),
    endsAt: new Date("2026-11-05T15:00:00.000Z"),
    summary: "Alumni meetup, Chakdara",
    description: "Bring a friend;\nno formal dress",
    location: "School hall",
    url: null,
  };

  it("produces a calendar with CRLF line endings and escaped text", () => {
    const ics = buildEventIcs(base);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(unfold(ics)).toContain("SUMMARY:Alumni meetup\\, Chakdara");
    expect(unfold(ics)).toContain("DESCRIPTION:Bring a friend\\;\\nno formal dress");
    expect(unfold(ics)).toContain("DTSTART:20261105T130000Z");
    expect(unfold(ics)).toContain("DTEND:20261105T150000Z");
  });

  it("omits DTEND, LOCATION and URL when they are absent", () => {
    const ics = buildEventIcs({ ...base, endsAt: null, location: null, url: null });
    expect(ics).not.toContain("DTEND");
    expect(ics).not.toContain("LOCATION");
    expect(ics).not.toContain("URL");
  });

  it("includes the join link when one is supplied", () => {
    const ics = buildEventIcs({ ...base, url: "https://meet.example.com/abc" });
    expect(unfold(ics)).toContain("URL:https://meet.example.com/abc");
  });
});
