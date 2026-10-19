import { describe, expect, it } from "vitest";

import { renderEmail } from "./templates";

describe("renderEmail", () => {
  it("escapes member-supplied text in the HTML body", () => {
    const rendered = renderEmail({
      heading: "Hello <b>",
      paragraphs: ["<img src=x onerror=alert(1)>"],
      action: { label: "Open", url: "https://example.com/app?x=1&y=2" },
    });
    expect(rendered.html).not.toContain("<img src=x");
    expect(rendered.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(rendered.html).toContain("https://example.com/app?x=1&amp;y=2");
  });

  it("includes the action link in the plain-text body", () => {
    const rendered = renderEmail({
      heading: "Verify",
      paragraphs: ["Confirm your address."],
      action: { label: "Verify email", url: "https://example.com/verify?token=abc" },
    });
    expect(rendered.text).toContain("Verify email: https://example.com/verify?token=abc");
  });
});
