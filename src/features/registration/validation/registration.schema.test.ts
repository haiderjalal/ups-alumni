import { describe, expect, it } from "vitest";

import { createSchoolStepSchema, profileStepSchema, privacyStepSchema } from "./registration.schema";

describe("school step", () => {
  const schema = createSchoolStepSchema(2026);

  it("accepts a listed-year answer with blank optional fields", () => {
    const result = schema.safeParse({ matricYear: "2018", batchNotListed: false, batchReviewNote: "" });
    expect(result.success).toBe(true);
  });

  it("requires a review note when the batch is not listed", () => {
    const result = schema.safeParse({ matricYear: "2015", batchNotListed: true, batchReviewNote: "short" });
    expect(result.success).toBe(false);
  });

  it("refuses a leaving year before the joining year", () => {
    const result = schema.safeParse({ matricYear: "2018", schoolJoinYear: "2012", schoolLeaveYear: "2010" });
    expect(result.success).toBe(false);
  });
});

describe("profile step", () => {
  const base = {
    professionalStatuses: ["STUDENT"],
    desiredRoles: [],
    skills: [],
    interests: [],
    education: [],
  };

  it("requires institution and field of study for students", () => {
    expect(profileStepSchema.safeParse(base).success).toBe(false);
    expect(profileStepSchema.safeParse({ ...base, institution: "NUST", fieldOfStudy: "Computing" }).success).toBe(true);
  });

  it("requires business details when business owner is selected", () => {
    const result = profileStepSchema.safeParse({ ...base, professionalStatuses: ["BUSINESS_OWNER"] });
    expect(result.success).toBe(false);
  });

  it("rejects unsafe website links", () => {
    const result = profileStepSchema.safeParse({ ...base, linkedinUrl: "javascript:alert(1)" });
    expect(result.success).toBe(false);
  });
});

describe("privacy step", () => {
  it("defaults contact details to private", () => {
    const parsed = privacyStepSchema.parse({});
    expect(parsed.emailVisibility).toBe("PRIVATE");
    expect(parsed.phoneVisibility).toBe("PRIVATE");
    expect(parsed.directoryDiscoverable).toBe(false);
    expect(parsed.newsletterOptIn).toBe(false);
  });
});
