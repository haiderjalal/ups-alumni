import { describe, expect, it } from "vitest";

import { getApplicationGaps, isApplicationComplete, type ApplicationSnapshot } from "./completeness";

const YEAR = 2026;

const BASE: ApplicationSnapshot = {
  fullName: "Ayesha Khan",
  currentCity: "Lahore",
  currentCountry: "Pakistan",
  matricYear: 2018,
  professionalStatuses: ["SEEKING_OPPORTUNITIES"],
  jobTitle: null,
  organization: null,
  institution: null,
  fieldOfStudy: null,
  expertise: null,
  desiredRolesCount: 1,
  hasCompleteBusiness: false,
  attested: true,
};

describe("application completeness", () => {
  it("is complete for a minimal, valid applicant", () => {
    expect(isApplicationComplete(BASE, YEAR)).toBe(true);
  });

  it("requires the matric year to be inside the accepted range", () => {
    expect(getApplicationGaps({ ...BASE, matricYear: null }, YEAR)).toContain("MATRIC_YEAR");
    expect(getApplicationGaps({ ...BASE, matricYear: 1949 }, YEAR)).toContain("MATRIC_YEAR");
    expect(getApplicationGaps({ ...BASE, matricYear: YEAR + 1 }, YEAR)).toContain("MATRIC_YEAR");
  });

  it("requires employment details for the employed status", () => {
    const gaps = getApplicationGaps({ ...BASE, professionalStatuses: ["EMPLOYED"] }, YEAR);
    expect(gaps).toEqual(["EMPLOYMENT_DETAILS"]);
    expect(getApplicationGaps({ ...BASE, professionalStatuses: ["EMPLOYED"], jobTitle: "Engineer", organization: "Acme" }, YEAR)).toEqual([]);
  });

  it("requires business details only when the business-owner status is chosen", () => {
    expect(getApplicationGaps({ ...BASE, professionalStatuses: ["BUSINESS_OWNER"] }, YEAR)).toEqual(["BUSINESS_DETAILS"]);
    expect(getApplicationGaps({ ...BASE, professionalStatuses: ["RETIRED"] }, YEAR)).toEqual([]);
  });

  it("requires attestation before submission", () => {
    expect(getApplicationGaps({ ...BASE, attested: false }, YEAR)).toEqual(["ATTESTATION"]);
  });

  it("requires at least one professional status", () => {
    expect(getApplicationGaps({ ...BASE, professionalStatuses: [] }, YEAR)).toContain("PROFESSIONAL_STATUS");
  });
});
