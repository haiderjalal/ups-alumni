import { describe, expect, it } from "vitest";

import { buildEventSlug, slugifyEventTitle } from "./event-slug";

describe("slugifyEventTitle", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugifyEventTitle("Batch 2017 Reunion!")).toBe("batch-2017-reunion");
  });

  it("removes accents", () => {
    expect(slugifyEventTitle("Café Meetup")).toBe("cafe-meetup");
  });

  it("falls back to a neutral word when nothing usable remains", () => {
    expect(slugifyEventTitle("!!!")).toBe("event");
    expect(slugifyEventTitle("یونیورسٹی")).toBe("event");
  });

  it("caps the length without leaving a trailing hyphen", () => {
    const slug = slugifyEventTitle(`${"word ".repeat(30)}`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("buildEventSlug", () => {
  it("appends the suffix", () => {
    expect(buildEventSlug("Batch 2017 Reunion", "a1b2c3d4")).toBe("batch-2017-reunion-a1b2c3d4");
  });

  it("rejects suffixes that are not lowercase alphanumeric", () => {
    expect(() => buildEventSlug("Reunion", "AB-12")).toThrow();
    expect(() => buildEventSlug("Reunion", "abc")).toThrow();
  });
});
