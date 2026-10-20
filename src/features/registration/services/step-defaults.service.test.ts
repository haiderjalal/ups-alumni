import { describe, expect, it, vi } from "vitest";

import type { ApplicationSnapshot } from "../domain/completeness";

import type { OnboardingSnapshot } from "./onboarding.service";
import { reviewSummary } from "./step-defaults.service";

vi.mock("server-only", () => ({}));

const COMPLETE_APPLICATION: ApplicationSnapshot = {
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
  attested: false,
};

// reviewSummary reads only these profile fields for the summary rows, so the rest of the record is left out.
const ONBOARDING = {
  user: { name: "Ayesha Khan", email: "ayesha@example.com", emailVerified: true },
  profile: {
    professionalStatuses: ["SEEKING_OPPORTUNITIES"],
    batchReviewRequested: false,
    matricYear: 2018,
    phoneE164: null,
    currentCity: "Lahore",
    currentCountry: "Pakistan",
    jobTitle: null,
    organization: null,
    institution: null,
    skills: [],
    directoryDiscoverable: false,
    contactVisibility: null,
  },
} as unknown as OnboardingSnapshot;

describe("reviewSummary", () => {
  it("does not list the attestation as missing, because the review form collects it", () => {
    const summary = reviewSummary({ onboarding: ONBOARDING, application: COMPLETE_APPLICATION, feeMinor: 50_000 });
    expect(summary.missing).toEqual([]);
  });

  it("still lists real gaps in the application", () => {
    const summary = reviewSummary({
      onboarding: ONBOARDING,
      application: { ...COMPLETE_APPLICATION, currentCity: null },
      feeMinor: 50_000,
    });
    expect(summary.missing).toEqual(["Add the city you live in."]);
  });
});
