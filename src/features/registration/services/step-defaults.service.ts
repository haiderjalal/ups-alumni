import "server-only";

import { currentYearInZone } from "@/lib/time";
import { formatRupees } from "@/lib/money";

import { getApplicationGaps, type ApplicationSnapshot } from "../domain/completeness";
import { PROFESSIONAL_STATUS_VALUES } from "../validation/registration.schema";

import { APPLICATION_GAP_MESSAGES, type OnboardingSnapshot } from "./onboarding.service";
import type { AccountStepDefaults } from "../components/account-step-form";
import type { PrivacyStepDefaults } from "../components/privacy-step-form";
import { UNLISTED_BATCH, type SchoolStepDefaults } from "../components/school-step-form";
import type { ProfileStepDefaults } from "../components/profile-step-form";
import type { ReviewSummaryRow } from "../components/review-step-form";

const STATUS_LABELS: Record<(typeof PROFESSIONAL_STATUS_VALUES)[number], string> = {
  EMPLOYED: "Employed",
  BUSINESS_OWNER: "Business owner",
  SELF_EMPLOYED_FREELANCER: "Self-employed or freelancer",
  STUDENT: "Student",
  SEEKING_OPPORTUNITIES: "Seeking opportunities",
  RETIRED: "Retired",
  OTHER: "Other",
};

/** A draft value wins over the saved value, so a half-finished step resumes exactly where it was left. */
function pick<T>(draft: Record<string, unknown> | undefined, key: string, saved: T): T {
  if (draft && key in draft && draft[key] !== undefined) {
    return draft[key] as T;
  }
  return saved;
}

const text = (value: string | null | undefined): string => value ?? "";
const yearText = (value: number | null | undefined): string => (value === null || value === undefined ? "" : String(value));

export function accountDefaults(snapshot: OnboardingSnapshot): AccountStepDefaults {
  const draft = snapshot.application.draft.account;
  const profile = snapshot.profile;
  return {
    fullName: pick(draft, "fullName", snapshot.user.name),
    phone: pick(draft, "phone", text(profile.phoneE164)),
    currentCity: pick(draft, "currentCity", text(profile.currentCity)),
    currentCountry: pick(draft, "currentCountry", text(profile.currentCountry)),
    hometown: pick(draft, "hometown", text(profile.hometown)),
    pronouns: pick(draft, "pronouns", text(profile.pronouns)),
    bio: pick(draft, "bio", text(profile.bio)),
  };
}

export function schoolDefaults(snapshot: OnboardingSnapshot, listedYears: readonly number[]): SchoolStepDefaults {
  const draft = snapshot.application.draft.school;
  const profile = snapshot.profile;
  const savedYear = profile.matricYear;
  const savedChoice =
    savedYear !== null && listedYears.includes(savedYear) && !profile.batchReviewRequested
      ? String(savedYear)
      : profile.batchReviewRequested || (savedYear !== null && !listedYears.includes(savedYear))
        ? UNLISTED_BATCH
        : "";
  const draftChoice = draft && "batchNotListed" in draft ? (draft.batchNotListed ? UNLISTED_BATCH : String(draft.matricYear ?? "")) : undefined;

  return {
    batchChoice: draftChoice ?? savedChoice,
    matricYear: pick(draft, "matricYear", yearText(savedYear)),
    batchReviewNote: pick(draft, "batchReviewNote", text(profile.batchReviewNote)),
    schoolJoinYear: pick(draft, "schoolJoinYear", yearText(profile.schoolJoinYear)),
    schoolLeaveYear: pick(draft, "schoolLeaveYear", yearText(profile.schoolLeaveYear)),
    section: pick(draft, "section", text(profile.section)),
    house: pick(draft, "house", text(profile.house)),
    rollNumber: pick(draft, "rollNumber", text(profile.rollNumber)),
    schoolMemory: pick(draft, "schoolMemory", text(profile.schoolMemory)),
  };
}

export function profileDefaults(snapshot: OnboardingSnapshot): ProfileStepDefaults {
  const draft = snapshot.application.draft.profile;
  const profile = snapshot.profile;
  const business = snapshot.business;
  const savedEducation = profile.educations.map((entry) => ({
    institution: entry.institution,
    qualification: entry.qualification,
    fieldOfStudy: text(entry.fieldOfStudy),
    startYear: yearText(entry.startYear),
    endYear: yearText(entry.endYear),
  }));

  return {
    professionalStatuses: pick(draft, "professionalStatuses", [...profile.professionalStatuses]),
    jobTitle: pick(draft, "jobTitle", text(profile.jobTitle)),
    organization: pick(draft, "organization", text(profile.organization)),
    industry: pick(draft, "industry", text(profile.industry)),
    companyUrl: pick(draft, "companyUrl", text(profile.companyUrl)),
    businessName: pick(draft, "businessName", text(business?.name)),
    businessSector: pick(draft, "businessSector", text(business?.sector)),
    businessCity: pick(draft, "businessCity", text(business?.city)),
    businessDescription: pick(draft, "businessDescription", text(business?.description)),
    businessProductsServices: pick(draft, "businessProductsServices", text(business?.productsServices)),
    businessWebsite: pick(draft, "businessWebsite", text(business?.websiteUrl)),
    expertise: pick(draft, "expertise", text(profile.expertise)),
    offeredServices: pick(draft, "offeredServices", text(profile.offeredServices)),
    portfolioUrl: pick(draft, "portfolioUrl", text(profile.portfolioUrl)),
    institution: pick(draft, "institution", text(profile.institution)),
    fieldOfStudy: pick(draft, "fieldOfStudy", text(profile.fieldOfStudy)),
    expectedCompletionYear: pick(draft, "expectedCompletionYear", yearText(profile.expectedCompletionYear)),
    desiredRoles: pick(draft, "desiredRoles", profile.desiredRoles.join(", ")),
    skills: pick(draft, "skills", profile.skills.map((link) => link.skill.name).join(", ")),
    interests: pick(draft, "interests", profile.interests.join(", ")),
    linkedinUrl: pick(draft, "linkedinUrl", text(profile.linkedinUrl)),
    education: Array.isArray(draft?.education) ? (draft.education as ProfileStepDefaults["education"]) : savedEducation,
    availableToMentor: pick(draft, "availableToMentor", profile.availableToMentor),
    seekingMentorship: pick(draft, "seekingMentorship", profile.seekingMentorship),
    hiring: pick(draft, "hiring", profile.hiring),
    openToCollaboration: pick(draft, "openToCollaboration", profile.openToCollaboration),
    volunteering: pick(draft, "volunteering", profile.volunteering),
  };
}

export function privacyDefaults(snapshot: OnboardingSnapshot): PrivacyStepDefaults {
  const draft = snapshot.application.draft.privacy;
  const visibility = snapshot.profile.contactVisibility;
  return {
    directoryDiscoverable: pick(draft, "directoryDiscoverable", snapshot.profile.directoryDiscoverable),
    emailVisibility: pick(draft, "emailVisibility", visibility?.email ?? "PRIVATE"),
    phoneVisibility: pick(draft, "phoneVisibility", visibility?.phone ?? "PRIVATE"),
    linkedinVisibility: pick(draft, "linkedinVisibility", visibility?.linkedin ?? "MEMBERS"),
    newsletterOptIn: pick(draft, "newsletterOptIn", snapshot.communication.newsletterOptIn),
    eventEmails: pick(draft, "eventEmails", snapshot.communication.eventEmails),
    connectionEmails: pick(draft, "connectionEmails", snapshot.communication.connectionEmails),
  };
}

const VISIBILITY_TEXT: Record<"PRIVATE" | "CONNECTIONS" | "MEMBERS", string> = {
  PRIVATE: "Only me and the network team",
  CONNECTIONS: "My accepted connections",
  MEMBERS: "All active members",
};

/** Read-only summary of everything the applicant has entered, plus what is still missing. */
export function reviewSummary(input: {
  onboarding: OnboardingSnapshot;
  application: ApplicationSnapshot;
  feeMinor: number;
}): { rows: ReviewSummaryRow[]; missing: string[]; feeLabel: string } {
  const { onboarding, application } = input;
  const profile = onboarding.profile;
  const statuses = profile.professionalStatuses.map((status) => STATUS_LABELS[status]).join(", ");
  const batch = profile.batchReviewRequested
    ? `${yearText(profile.matricYear)} (manual review requested)`
    : yearText(profile.matricYear);
  const visibility = profile.contactVisibility;

  const rows: ReviewSummaryRow[] = [
    { label: "Name", value: onboarding.user.name },
    { label: "Email", value: onboarding.user.email },
    { label: "Phone", value: text(profile.phoneE164) },
    { label: "Current location", value: [profile.currentCity, profile.currentCountry].filter(Boolean).join(", ") },
    { label: "Matric completion year", value: batch },
    { label: "Current status", value: statuses },
    { label: "Job or study", value: [profile.jobTitle, profile.organization, profile.institution].filter(Boolean).join(" · ") },
    { label: "Skills", value: profile.skills.map((link) => link.skill.name).join(", ") },
    { label: "Directory listing", value: profile.directoryDiscoverable ? "Visible to active members" : "Not listed" },
    { label: "Email visibility", value: VISIBILITY_TEXT[visibility?.email ?? "PRIVATE"] },
    { label: "Phone visibility", value: VISIBILITY_TEXT[visibility?.phone ?? "PRIVATE"] },
  ];

  const gaps = getApplicationGaps(application, currentYearInZone());
  return {
    rows,
    missing: gaps.map((gap) => APPLICATION_GAP_MESSAGES[gap]),
    feeLabel: formatRupees(input.feeMinor),
  };
}
