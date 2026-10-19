import "server-only";

import { randomBytes } from "node:crypto";

import type { ConsentScope, Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/features/audit/services/audit.service";
import { saveOwnedBusiness } from "@/features/businesses/services/business-owner.service";
import { assertApplicationTransition, type ApplicationState } from "@/features/membership/domain/state-machines";
import { createNotification } from "@/features/notifications/services/notification.service";
import { provisionAlumniRecords } from "@/features/membership/services/provision.service";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { cleanSingleLine, cleanText, toSafeHttpUrl } from "@/lib/security/text";
import { currentYearInZone } from "@/lib/time";
import type { ActionResult } from "@/types/action";
import { actionError, actionOk } from "@/types/action";

import { getApplicationGaps, type ApplicationGap } from "../domain/completeness";
import { isEditableApplicationState, nextStepSlug, type RegistrationStepSlug } from "../domain/steps";
import {
  accountStepSchema,
  attestationSchema,
  createSchoolStepSchema,
  privacyStepSchema,
  profileStepSchema,
  type SavableStepSlug,
} from "../validation/registration.schema";

import { loadApplicationSnapshot } from "./application-snapshot.service";

const MAX_DRAFT_BYTES = 20_000;

/** Messages for each incomplete item, phrased for the applicant. Keep them free of internal terms. */
export const APPLICATION_GAP_MESSAGES: Record<ApplicationGap, string> = {
  FULL_NAME: "Add your full name.",
  CURRENT_CITY: "Add the city you live in.",
  CURRENT_COUNTRY: "Add the country you live in.",
  MATRIC_YEAR: "Add the year you completed Class 10.",
  PROFESSIONAL_STATUS: "Choose at least one current status.",
  EMPLOYMENT_DETAILS: "Add your job title and organization.",
  STUDENT_DETAILS: "Add your institution and course.",
  FREELANCE_DETAILS: "Describe your expertise.",
  JOB_SEEKING_DETAILS: "Add at least one role you are looking for.",
  BUSINESS_DETAILS: "Complete your business details.",
  ATTESTATION: "Confirm your attendance and that the information is accurate.",
};

export interface OnboardingSnapshot {
  user: { name: string; email: string; emailVerified: boolean };
  application: {
    status: ApplicationState;
    currentStep: number;
    draft: Partial<Record<SavableStepSlug, Record<string, unknown>>>;
    decisionReason: string | null;
    attestedAt: Date | null;
    submittedAt: Date | null;
  };
  profile: Prisma.AlumniProfileGetPayload<{ include: { skills: { include: { skill: true } }; educations: true; contactVisibility: true } }>;
  communication: { newsletterOptIn: boolean; eventEmails: boolean; connectionEmails: boolean };
  business: { name: string; sector: string; city: string; description: string; productsServices: string; websiteUrl: string | null } | null;
}

/** Everything the onboarding screens need, read in one pass for the signed-in applicant. */
export async function loadOnboardingSnapshot(userId: string): Promise<OnboardingSnapshot | null> {
  await provisionAlumniRecords(userId);

  const [user, application, profile, communication, ownership] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, emailVerified: true } }),
    db.alumniApplication.findUnique({ where: { userId } }),
    db.alumniProfile.findUnique({
      where: { userId },
      include: { skills: { include: { skill: true } }, educations: true, contactVisibility: true },
    }),
    db.communicationPreference.findUnique({
      where: { userId },
      select: { newsletterOptIn: true, eventEmails: true, connectionEmails: true },
    }),
    db.businessOwner.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        business: {
          select: { name: true, sector: true, city: true, description: true, productsServices: true, websiteUrl: true },
        },
      },
    }),
  ]);

  if (!user || !application || !profile) {
    return null;
  }

  return {
    user,
    application: {
      status: application.status,
      currentStep: application.currentStep,
      draft: (application.draftJson as Partial<Record<SavableStepSlug, Record<string, unknown>>> | null) ?? {},
      decisionReason: application.decisionReason,
      attestedAt: application.attestedAt,
      submittedAt: application.submittedAt,
    },
    profile,
    communication: communication ?? { newsletterOptIn: false, eventEmails: true, connectionEmails: true },
    business: ownership?.business ?? null,
  };
}

async function requireEditableApplication(userId: string): Promise<ActionResult<{ version: number }>> {
  const application = await db.alumniApplication.findUnique({
    where: { userId },
    select: { status: true, version: true },
  });
  if (!application || !isEditableApplicationState(application.status)) {
    return actionError("This application can no longer be edited. Check its status on your dashboard.");
  }
  return actionOk({ version: application.version });
}

/**
 * Autosave. Stores what the applicant typed in the server-side draft, without validating or normalizing it.
 * The normalized profile is written only when the step is continued.
 */
export async function saveStepDraft(input: {
  userId: string;
  step: SavableStepSlug;
  values: unknown;
}): Promise<ActionResult> {
  if (typeof input.values !== "object" || input.values === null || Array.isArray(input.values)) {
    return actionError("This step could not be saved. Refresh the page and try again.");
  }
  const editable = await requireEditableApplication(input.userId);
  if (!editable.ok) {
    return editable;
  }

  const serialized = JSON.stringify(input.values);
  if (serialized.length > MAX_DRAFT_BYTES) {
    return actionError("This step is too long to save as a draft. Shorten some answers and try again.");
  }

  const current = await db.alumniApplication.findUnique({ where: { userId: input.userId }, select: { draftJson: true } });
  const draft = { ...((current?.draftJson as Record<string, unknown> | null) ?? {}), [input.step]: input.values as Record<string, unknown> };

  await db.alumniApplication.update({
    where: { userId: input.userId },
    data: { draftJson: draft as Prisma.InputJsonValue, draftUpdatedAt: new Date() },
  });
  return actionOk();
}

async function setConsent(
  tx: Prisma.TransactionClient,
  userId: string,
  scope: ConsentScope,
  granted: boolean,
): Promise<void> {
  const open = await tx.consentRecord.findFirst({
    where: { userId, scope, revokedAt: null },
    select: { id: true },
  });
  if (granted && !open) {
    await tx.consentRecord.create({ data: { userId, scope, source: "registration" } });
  }
  if (!granted && open) {
    await tx.consentRecord.update({ where: { id: open.id }, data: { revokedAt: new Date() } });
  }
}

function skillSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/**
 * Validates one step strictly, writes its normalized data, and advances progress. The draft for that step is
 * cleared. Validation errors come back per field so the form can show them next to the input.
 */
export async function continueStep(input: {
  userId: string;
  step: SavableStepSlug;
  values: unknown;
}): Promise<ActionResult<{ nextStep: RegistrationStepSlug | null }>> {
  const editable = await requireEditableApplication(input.userId);
  if (!editable.ok) {
    return editable;
  }

  const currentYear = currentYearInZone();
  const nextStep = nextStepSlug(input.step);

  switch (input.step) {
    case "account":
      return saveAccountStep(input.userId, input.values, nextStep, true);
    case "school":
      return saveSchoolStep(input.userId, input.values, nextStep, currentYear, true);
    case "profile":
      return saveProfileStep(input.userId, input.values, nextStep, currentYear, true);
    case "privacy":
      return savePrivacyStep(input.userId, input.values, nextStep, true);
  }
}

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    errors[String(issue.path[0] ?? "form")] ??= issue.message;
  }
  return errors;
}

async function markStepComplete(
  tx: Prisma.TransactionClient,
  userId: string,
  step: SavableStepSlug,
  nextStep: RegistrationStepSlug | null,
): Promise<void> {
  const application = await tx.alumniApplication.findUniqueOrThrow({
    where: { userId },
    select: { draftJson: true, currentStep: true },
  });
  const draft = { ...((application.draftJson as Record<string, unknown> | null) ?? {}) };
  delete draft[step];

  const reachedIndex = nextStep ? (["account", "school", "profile", "privacy", "review"] as const).indexOf(nextStep) + 1 : 5;
  await tx.alumniApplication.update({
    where: { userId },
    data: {
      draftJson: draft as Prisma.InputJsonValue,
      draftUpdatedAt: new Date(),
      currentStep: Math.max(application.currentStep, reachedIndex),
    },
  });
}

async function saveAccountStep(
  userId: string,
  values: unknown,
  nextStep: RegistrationStepSlug | null,
  advance: boolean,
): Promise<ActionResult<{ nextStep: RegistrationStepSlug | null }>> {
  const parsed = accountStepSchema.safeParse(values);
  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  }

  let phoneE164: string | null = null;
  if (parsed.data.phone) {
    phoneE164 = normalizePhone(parsed.data.phone);
    if (!phoneE164) {
      return actionError("Please correct the highlighted fields.", {
        phone: "Enter a valid phone number. Include the country code for numbers outside Pakistan.",
      });
    }
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { name: cleanSingleLine(parsed.data.fullName) } });
    await tx.alumniProfile.update({
      where: { userId },
      data: {
        phoneE164,
        currentCity: cleanSingleLine(parsed.data.currentCity),
        currentCountry: cleanSingleLine(parsed.data.currentCountry),
        hometown: parsed.data.hometown ? cleanSingleLine(parsed.data.hometown) : null,
        pronouns: parsed.data.pronouns ? cleanSingleLine(parsed.data.pronouns) : null,
        bio: parsed.data.bio ? cleanText(parsed.data.bio) : null,
      },
    });
    if (advance) {
      await markStepComplete(tx, userId, "account", nextStep);
    }
  });

  return actionOk({ nextStep });
}

async function saveSchoolStep(
  userId: string,
  values: unknown,
  nextStep: RegistrationStepSlug | null,
  currentYear: number,
  advance: boolean,
): Promise<ActionResult<{ nextStep: RegistrationStepSlug | null }>> {
  const parsed = createSchoolStepSchema(currentYear).safeParse(values);
  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  }
  const data = parsed.data;

  // Batch choices come from the admin catalog. Anything else needs the manual-review route.
  const listedBatch = data.batchNotListed
    ? null
    : await db.batch.findFirst({ where: { year: data.matricYear, isListed: true }, select: { id: true } });
  if (!data.batchNotListed && !listedBatch) {
    return actionError("Please correct the highlighted fields.", {
      matricYear: "That year is not in the batch list. Choose My batch is not listed to request a manual review.",
    });
  }

  await db.$transaction(async (tx) => {
    await tx.alumniProfile.update({
      where: { userId },
      data: {
        matricYear: data.matricYear ?? null,
        batchId: listedBatch?.id ?? null,
        batchReviewRequested: data.batchNotListed,
        batchReviewNote: data.batchNotListed ? cleanText(data.batchReviewNote) : null,
        schoolJoinYear: data.schoolJoinYear ?? null,
        schoolLeaveYear: data.schoolLeaveYear ?? null,
        section: data.section ? cleanSingleLine(data.section) : null,
        house: data.house ? cleanSingleLine(data.house) : null,
        rollNumber: data.rollNumber ? cleanSingleLine(data.rollNumber) : null,
        schoolMemory: data.schoolMemory ? cleanText(data.schoolMemory) : null,
      },
    });
    if (advance) {
      await markStepComplete(tx, userId, "school", nextStep);
    }
  });

  return actionOk({ nextStep });
}

async function saveProfileStep(
  userId: string,
  values: unknown,
  nextStep: RegistrationStepSlug | null,
  currentYear: number,
  advance: boolean,
): Promise<ActionResult<{ nextStep: RegistrationStepSlug | null }>> {
  const parsed = profileStepSchema.safeParse(values);
  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  }
  const data = parsed.data;

  const expectedYear = data.expectedCompletionYear;
  if (expectedYear !== undefined && expectedYear < currentYear) {
    return actionError("Please correct the highlighted fields.", {
      expectedCompletionYear: "The expected completion year cannot be in the past.",
    });
  }

  const companyUrl = data.companyUrl ? toSafeHttpUrl(data.companyUrl) : null;
  const portfolioUrl = data.portfolioUrl ? toSafeHttpUrl(data.portfolioUrl) : null;
  const linkedinUrl = data.linkedinUrl ? toSafeHttpUrl(data.linkedinUrl) : null;

  const skillNames = [...new Map(data.skills.map((skill) => [skillSlug(skill), cleanSingleLine(skill)])).entries()].filter(
    ([slug]) => slug.length > 0,
  );

  await db.$transaction(async (tx) => {
    await tx.alumniProfile.update({
      where: { userId },
      data: {
        professionalStatuses: data.professionalStatuses,
        jobTitle: data.jobTitle ? cleanSingleLine(data.jobTitle) : null,
        organization: data.organization ? cleanSingleLine(data.organization) : null,
        industry: data.industry ? cleanSingleLine(data.industry) : null,
        companyUrl,
        expertise: data.expertise ? cleanText(data.expertise) : null,
        offeredServices: data.offeredServices ? cleanText(data.offeredServices) : null,
        portfolioUrl,
        institution: data.institution ? cleanSingleLine(data.institution) : null,
        fieldOfStudy: data.fieldOfStudy ? cleanSingleLine(data.fieldOfStudy) : null,
        expectedCompletionYear: expectedYear ?? null,
        desiredRoles: data.desiredRoles.map(cleanSingleLine),
        interests: data.interests.map(cleanSingleLine),
        linkedinUrl,
        availableToMentor: data.availableToMentor,
        seekingMentorship: data.seekingMentorship,
        hiring: data.hiring,
        openToCollaboration: data.openToCollaboration,
        volunteering: data.volunteering,
      },
    });

    const profile = await tx.alumniProfile.findUniqueOrThrow({ where: { userId }, select: { id: true } });
    await tx.profileSkill.deleteMany({ where: { profileId: profile.id } });
    for (const [slug, name] of skillNames) {
      const skill = await tx.skill.upsert({
        where: { slug },
        create: { slug, name },
        update: {},
        select: { id: true },
      });
      await tx.profileSkill.create({ data: { profileId: profile.id, skillId: skill.id } });
    }

    await tx.education.deleteMany({ where: { profileId: profile.id } });
    if (data.education.length > 0) {
      await tx.education.createMany({
        data: data.education.map((entry) => ({
          profileId: profile.id,
          institution: cleanSingleLine(entry.institution),
          qualification: cleanSingleLine(entry.qualification),
          fieldOfStudy: entry.fieldOfStudy ? cleanSingleLine(entry.fieldOfStudy) : null,
          startYear: entry.startYear ?? null,
          endYear: entry.endYear ?? null,
        })),
      });
    }

    if (advance) {
      await markStepComplete(tx, userId, "profile", nextStep);
    }
  });

  if (data.professionalStatuses.includes("BUSINESS_OWNER")) {
    await saveOwnedBusiness(userId, {
      name: cleanSingleLine(data.businessName),
      sector: cleanSingleLine(data.businessSector),
      city: cleanSingleLine(data.businessCity),
      description: cleanText(data.businessDescription),
      productsServices: cleanText(data.businessProductsServices),
      websiteUrl: (data.businessWebsite ? toSafeHttpUrl(data.businessWebsite) : null) ?? undefined,
    });
  }

  return actionOk({ nextStep });
}

async function savePrivacyStep(
  userId: string,
  values: unknown,
  nextStep: RegistrationStepSlug | null,
  advance: boolean,
): Promise<ActionResult<{ nextStep: RegistrationStepSlug | null }>> {
  const parsed = privacyStepSchema.safeParse(values);
  if (!parsed.success) {
    return actionError("Please correct the highlighted fields.", fieldErrorsFrom(parsed.error.issues));
  }
  const data = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.alumniProfile.update({
      where: { userId },
      data: { directoryDiscoverable: data.directoryDiscoverable },
    });
    const profile = await tx.alumniProfile.findUniqueOrThrow({ where: { userId }, select: { id: true } });
    await tx.contactVisibility.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        email: data.emailVisibility,
        phone: data.phoneVisibility,
        linkedin: data.linkedinVisibility,
      },
      update: { email: data.emailVisibility, phone: data.phoneVisibility, linkedin: data.linkedinVisibility },
    });
    await tx.communicationPreference.upsert({
      where: { userId },
      create: {
        userId,
        newsletterOptIn: data.newsletterOptIn,
        eventEmails: data.eventEmails,
        connectionEmails: data.connectionEmails,
        unsubscribeToken: randomBytes(24).toString("base64url"),
      },
      update: {
        newsletterOptIn: data.newsletterOptIn,
        eventEmails: data.eventEmails,
        connectionEmails: data.connectionEmails,
      },
    });
    await setConsent(tx, userId, "DIRECTORY_LISTING", data.directoryDiscoverable);
    await setConsent(tx, userId, "NEWSLETTER", data.newsletterOptIn);
    if (advance) {
      await markStepComplete(tx, userId, "privacy", nextStep);
    }
  });

  return actionOk({ nextStep });
}

/**
 * Final submission. Requires a verified email, both attestations, and a complete application. The status change
 * is a conditional update on the version counter, so a double click cannot submit twice.
 */
export async function submitApplication(input: {
  userId: string;
  attestations: unknown;
}): Promise<ActionResult<{ status: ApplicationState }>> {
  const attestation = attestationSchema.safeParse(input.attestations);
  if (!attestation.success) {
    return actionError("Please confirm both statements before submitting.", fieldErrorsFrom(attestation.error.issues));
  }

  const user = await db.user.findUnique({ where: { id: input.userId }, select: { emailVerified: true } });
  if (!user?.emailVerified) {
    return actionError("Verify your email address before submitting your application.");
  }

  const application = await db.alumniApplication.findUnique({
    where: { userId: input.userId },
    select: { status: true, version: true },
  });
  if (!application || !isEditableApplicationState(application.status)) {
    return actionError("This application has already been submitted.");
  }

  const snapshot = await loadApplicationSnapshot(db, input.userId);
  const gaps = getApplicationGaps({ ...snapshot, attested: true }, currentYearInZone());
  if (gaps.length > 0) {
    return actionError(
      "Finish the highlighted sections before submitting.",
      Object.fromEntries(gaps.map((gap, index) => [`gap_${index}`, APPLICATION_GAP_MESSAGES[gap]])),
    );
  }

  const from = application.status as ApplicationState;
  assertApplicationTransition(from, "SUBMITTED");

  const now = new Date();
  const outcome = await db.$transaction(async (tx) => {
    const updated = await tx.alumniApplication.updateMany({
      where: { userId: input.userId, version: application.version, status: from },
      data: {
        status: "SUBMITTED",
        submittedAt: now,
        attestedAt: now,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      return false;
    }
    await recordAudit(tx, {
      action: "application.submitted",
      entityType: "application",
      entityId: input.userId,
      actorId: input.userId,
      metadata: { fromStatus: from },
    });
    await createNotification(tx, {
      userId: input.userId,
      kind: "APPLICATION_UPDATE",
      title: "Application received",
      body: "Your application is in the queue for alumni review. Complete your registration fee payment to continue.",
      linkPath: "/app/status",
    });
    return true;
  });

  if (!outcome) {
    return actionError("Your application changed while you were submitting. Refresh the page and try again.");
  }
  return actionOk({ status: "SUBMITTED" });
}


export type ProfileSection = "account" | "occupation" | "privacy";

/**
 * Saves one profile section for a member after onboarding. It uses the same validation and writes as the
 * registration steps, but it does not change application progress and does not require an editable application.
 * School and batch fields are deliberately excluded: they are identity-sensitive and go through batch review.
 */
export async function updateProfileSection(input: {
  userId: string;
  section: ProfileSection;
  values: unknown;
}): Promise<ActionResult<{ nextStep: RegistrationStepSlug | null }>> {
  switch (input.section) {
    case "account":
      return saveAccountStep(input.userId, input.values, null, false);
    case "occupation":
      return saveProfileStep(input.userId, input.values, null, currentYearInZone(), false);
    case "privacy":
      return savePrivacyStep(input.userId, input.values, null, false);
  }
}
