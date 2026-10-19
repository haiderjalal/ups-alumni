import { z } from "zod";

import { MIN_MATRIC_YEAR } from "../domain/completeness";
import { toSafeHttpUrl } from "@/lib/security/text";

const VISIBILITY_LEVELS = ["PRIVATE", "CONNECTIONS", "MEMBERS"] as const;

export const PROFESSIONAL_STATUS_VALUES = [
  "EMPLOYED",
  "BUSINESS_OWNER",
  "SELF_EMPLOYED_FREELANCER",
  "STUDENT",
  "SEEKING_OPPORTUNITIES",
  "RETIRED",
  "OTHER",
] as const;

const text = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer.`);
const optionalText = (max: number) => text(max).optional().default("");
const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max, `Use ${max} characters or fewer.`);

/** Blank form inputs arrive as "" and must be treated as "not given", not as the number zero. */
const optionalYear = (min: number, max: number, message: string) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number({ message }).int(message).min(min, message).max(max, message).optional(),
  );

const optionalHttps = (label: string) =>
  z
    .string()
    .trim()
    .max(300)
    .optional()
    .default("")
    .refine((value) => value === "" || toSafeHttpUrl(value) !== null, { message: `${label} must be a valid web address.` });

/** Step A. Name is stored on the account; everything else on the alumni profile. */
export const accountStepSchema = z.object({
  fullName: requiredText(120, "Enter your full name."),
  phone: optionalText(24),
  currentCity: requiredText(80, "Enter the city you live in."),
  currentCountry: requiredText(80, "Enter the country you live in."),
  hometown: optionalText(80),
  pronouns: optionalText(40),
  bio: optionalText(600),
});
export type AccountStepValues = z.infer<typeof accountStepSchema>;

export function createSchoolStepSchema(currentYear: number) {
  return z
    .object({
      matricYear: optionalYear(MIN_MATRIC_YEAR, currentYear, "Enter the year you completed Class 10."),
      batchNotListed: z.boolean().default(false),
      batchReviewNote: optionalText(400),
      schoolJoinYear: optionalYear(MIN_MATRIC_YEAR, currentYear, "Enter a valid year."),
      schoolLeaveYear: optionalYear(MIN_MATRIC_YEAR, currentYear, "Enter a valid year."),
      section: optionalText(40),
      house: optionalText(40),
      rollNumber: optionalText(40),
      schoolMemory: optionalText(600),
    })
    .superRefine((value, ctx) => {
      if (value.matricYear === undefined) {
        ctx.addIssue({ code: "custom", path: ["matricYear"], message: "Enter the year you completed Class 10." });
      }
      if (value.batchNotListed && value.batchReviewNote.length < 10) {
        ctx.addIssue({
          code: "custom",
          path: ["batchReviewNote"],
          message: "Describe your batch briefly so a reviewer can check it (at least 10 characters).",
        });
      }
      if (value.schoolJoinYear && value.schoolLeaveYear && value.schoolLeaveYear < value.schoolJoinYear) {
        ctx.addIssue({
          code: "custom",
          path: ["schoolLeaveYear"],
          message: "The leaving year cannot be before the joining year.",
        });
      }
    });
}
export type SchoolStepValues = z.input<ReturnType<typeof createSchoolStepSchema>>;

export const educationEntrySchema = z.object({
  institution: requiredText(160, "Enter the institution name."),
  qualification: requiredText(120, "Enter the qualification."),
  fieldOfStudy: optionalText(120),
  startYear: optionalYear(1950, 2100, "Enter a valid year."),
  endYear: optionalYear(1950, 2100, "Enter a valid year."),
});

/** Step C. Conditional requirements mirror getApplicationGaps so an applicant cannot continue with gaps. */
export const profileStepSchema = z
  .object({
    professionalStatuses: z
      .array(z.enum(PROFESSIONAL_STATUS_VALUES))
      .min(1, "Choose at least one current status."),
    jobTitle: optionalText(120),
    organization: optionalText(160),
    industry: optionalText(120),
    companyUrl: optionalHttps("Company website"),
    businessName: optionalText(160),
    businessSector: optionalText(120),
    businessCity: optionalText(80),
    businessDescription: optionalText(1500),
    businessProductsServices: optionalText(800),
    businessWebsite: optionalHttps("Business website"),
    expertise: optionalText(600),
    offeredServices: optionalText(600),
    portfolioUrl: optionalHttps("Portfolio"),
    institution: optionalText(160),
    fieldOfStudy: optionalText(120),
    expectedCompletionYear: optionalYear(2000, 2100, "Enter a valid year."),
    desiredRoles: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
    skills: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
    interests: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
    linkedinUrl: optionalHttps("LinkedIn profile"),
    education: z.array(educationEntrySchema).max(5).default([]),
    availableToMentor: z.boolean().default(false),
    seekingMentorship: z.boolean().default(false),
    hiring: z.boolean().default(false),
    openToCollaboration: z.boolean().default(false),
    volunteering: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const statuses = new Set(value.professionalStatuses);
    const requireField = (condition: boolean, path: string, message: string) => {
      if (condition) {
        ctx.addIssue({ code: "custom", path: [path], message });
      }
    };

    requireField(statuses.has("EMPLOYED") && !value.jobTitle, "jobTitle", "Enter your job title.");
    requireField(statuses.has("EMPLOYED") && !value.organization, "organization", "Enter the organization you work for.");
    requireField(statuses.has("STUDENT") && !value.institution, "institution", "Enter the institution you attend.");
    requireField(statuses.has("STUDENT") && !value.fieldOfStudy, "fieldOfStudy", "Enter your course or field.");
    requireField(statuses.has("SELF_EMPLOYED_FREELANCER") && !value.expertise, "expertise", "Describe your expertise.");
    requireField(
      statuses.has("SEEKING_OPPORTUNITIES") && value.desiredRoles.length === 0,
      "desiredRoles",
      "Add at least one role you are looking for.",
    );
    requireField(statuses.has("BUSINESS_OWNER") && !value.businessName, "businessName", "Enter your business name.");
    requireField(statuses.has("BUSINESS_OWNER") && !value.businessSector, "businessSector", "Enter the business sector.");
    requireField(statuses.has("BUSINESS_OWNER") && !value.businessCity, "businessCity", "Enter the business city.");
    requireField(
      statuses.has("BUSINESS_OWNER") && !value.businessDescription,
      "businessDescription",
      "Describe what the business does.",
    );
    requireField(
      statuses.has("BUSINESS_OWNER") && !value.businessProductsServices,
      "businessProductsServices",
      "List the main products or services.",
    );
  });
export type ProfileStepValues = z.input<typeof profileStepSchema>;

/** Step D. Phone and email are private unless the member widens them. Newsletter is a separate opt-in. */
export const privacyStepSchema = z.object({
  directoryDiscoverable: z.boolean().default(false),
  emailVisibility: z.enum(VISIBILITY_LEVELS).default("PRIVATE"),
  phoneVisibility: z.enum(VISIBILITY_LEVELS).default("PRIVATE"),
  linkedinVisibility: z.enum(VISIBILITY_LEVELS).default("MEMBERS"),
  newsletterOptIn: z.boolean().default(false),
  eventEmails: z.boolean().default(true),
  connectionEmails: z.boolean().default(true),
});
export type PrivacyStepValues = z.input<typeof privacyStepSchema>;

/** Step E. Both attestations are required before the application can be submitted. */
export const attestationSchema = z.object({
  attendedUps: z.boolean().refine((value) => value, { message: "Confirm that you attended University Public School." }),
  informationAccurate: z
    .boolean()
    .refine((value) => value, { message: "Confirm that the information you gave is accurate." }),
});
export type AttestationValues = z.input<typeof attestationSchema>;

export const STEP_SCHEMA_NAMES = ["account", "school", "profile", "privacy"] as const;
export type SavableStepSlug = (typeof STEP_SCHEMA_NAMES)[number];

export function isSavableStep(slug: string): slug is SavableStepSlug {
  return (STEP_SCHEMA_NAMES as readonly string[]).includes(slug);
}
