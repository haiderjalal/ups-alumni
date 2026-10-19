import { describe, expect, it } from "vitest";

import { buildMemberHeadline } from "./member-headline";

describe("buildMemberHeadline", () => {
  it("joins title and organization", () => {
    expect(buildMemberHeadline({ jobTitle: "Engineer", organization: "Acme" })).toBe("Engineer at Acme");
  });

  it("uses whichever field is present", () => {
    expect(buildMemberHeadline({ jobTitle: "Engineer", organization: null })).toBe("Engineer");
    expect(buildMemberHeadline({ jobTitle: null, organization: "Acme" })).toBe("Acme");
  });

  it("returns null when both fields are missing or blank", () => {
    expect(buildMemberHeadline({ jobTitle: null, organization: null })).toBeNull();
    expect(buildMemberHeadline({ jobTitle: "  ", organization: "" })).toBeNull();
  });
});
