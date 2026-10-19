import { describe, expect, it } from "vitest";

import { cleanText, escapeHtml, neutralizeSpreadsheetFormula, toSafeHttpUrl } from "./text";

describe("escapeHtml", () => {
  it("escapes markup so user text cannot inject HTML into emails or receipts", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(escapeHtml("Tom & Jerry's")).toBe("Tom &amp; Jerry&#39;s");
  });
});

describe("cleanText", () => {
  it("removes control characters but keeps line breaks", () => {
    expect(cleanText("hello\u0000\u0007 world\n\nnext")).toBe("hello world\n\nnext");
  });

  it("collapses runs of spaces and trims", () => {
    expect(cleanText("   a    b   ")).toBe("a b");
  });
});

describe("toSafeHttpUrl", () => {
  it("accepts http and https links", () => {
    expect(toSafeHttpUrl("https://example.com/path")).toBe("https://example.com/path");
    expect(toSafeHttpUrl("http://example.com")).toBe("http://example.com/");
  });

  it("rejects script, data and credential-bearing URLs", () => {
    expect(toSafeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(toSafeHttpUrl("data:text/html,<script>x</script>")).toBeNull();
    expect(toSafeHttpUrl("https://user:pass@example.com")).toBeNull();
    expect(toSafeHttpUrl("not a url")).toBeNull();
  });
});

describe("neutralizeSpreadsheetFormula", () => {
  it("prefixes values that a spreadsheet would evaluate as formulas", () => {
    expect(neutralizeSpreadsheetFormula("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(neutralizeSpreadsheetFormula("+1")).toBe("'+1");
    expect(neutralizeSpreadsheetFormula("-2")).toBe("'-2");
    expect(neutralizeSpreadsheetFormula("@sum")).toBe("'@sum");
  });

  it("leaves ordinary text unchanged", () => {
    expect(neutralizeSpreadsheetFormula("Ayesha Khan")).toBe("Ayesha Khan");
  });
});
