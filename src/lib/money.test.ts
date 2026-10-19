import { describe, expect, it } from "vitest";

import { formatRupees, rupeesToMinor } from "./money";

describe("money in minor units", () => {
  it("stores PKR 500 as 50000 paisa", () => {
    expect(rupeesToMinor(500)).toBe(50_000);
  });

  it("rounds fractional rupees to the nearest paisa", () => {
    expect(rupeesToMinor(0.1 + 0.2)).toBe(30);
    expect(rupeesToMinor(499.995)).toBe(50_000);
  });

  it("formats whole amounts without decimals, as used across the site", () => {
    expect(formatRupees(50_000)).toBe("Rs. 500");
    expect(formatRupees(50_050)).toBe("Rs. 500.50");
    expect(formatRupees(1_250_000)).toBe("Rs. 12,500");
  });

  it("rejects non-integer minor amounts instead of silently rounding them", () => {
    expect(() => formatRupees(500.5)).toThrow(RangeError);
  });

  it("rejects non-finite rupee inputs", () => {
    expect(() => rupeesToMinor(Number.NaN)).toThrow(RangeError);
  });
});
