/**
 * Decides whether an alumni application has every required field. Activation depends on this result,
 * so the rules live here as pure code with unit tests. Optional fields never block completion.
 */

export type ProfessionalStatusValue =
  | "EMPLOYED"
  | "BUSINESS_OWNER"
  | "SELF_EMPLOYED_FREELANCER"
  | "STUDENT"
  | "SEEKING_OPPORTUNITIES"
  | "RETIRED"
  | "OTHER";

export interface ApplicationSnapshot {
  fullName: string | null;
  currentCity: string | null;
  currentCountry: string | null;
  matricYear: number | null;
  professionalStatuses: readonly ProfessionalStatusValue[];
  jobTitle: string | null;
  organization: string | null;
  institution: string | null;
  fieldOfStudy: string | null;
  expertise: string | null;
  desiredRolesCount: number;
  hasCompleteBusiness: boolean;
  attested: boolean;
}

export type ApplicationGap =
  | "FULL_NAME"
  | "CURRENT_CITY"
  | "CURRENT_COUNTRY"
  | "MATRIC_YEAR"
  | "PROFESSIONAL_STATUS"
  | "EMPLOYMENT_DETAILS"
  | "STUDENT_DETAILS"
  | "FREELANCE_DETAILS"
  | "JOB_SEEKING_DETAILS"
  | "BUSINESS_DETAILS"
  | "ATTESTATION";

/** Earliest matric year accepted by validation. A sanity bound only, not the school's founding date. */
export const MIN_MATRIC_YEAR = 1950;

export function getApplicationGaps(snapshot: ApplicationSnapshot, currentYear: number): ApplicationGap[] {
  const gaps: ApplicationGap[] = [];
  const has = (value: string | null): boolean => Boolean(value && value.trim());

  if (!has(snapshot.fullName)) gaps.push("FULL_NAME");
  if (!has(snapshot.currentCity)) gaps.push("CURRENT_CITY");
  if (!has(snapshot.currentCountry)) gaps.push("CURRENT_COUNTRY");

  const matricYearValid =
    snapshot.matricYear !== null && snapshot.matricYear >= MIN_MATRIC_YEAR && snapshot.matricYear <= currentYear;
  if (!matricYearValid) gaps.push("MATRIC_YEAR");

  const statuses = new Set(snapshot.professionalStatuses);
  if (statuses.size === 0) {
    gaps.push("PROFESSIONAL_STATUS");
  }

  if (statuses.has("EMPLOYED") && !(has(snapshot.jobTitle) && has(snapshot.organization))) {
    gaps.push("EMPLOYMENT_DETAILS");
  }
  if (statuses.has("STUDENT") && !(has(snapshot.institution) && has(snapshot.fieldOfStudy))) {
    gaps.push("STUDENT_DETAILS");
  }
  if (statuses.has("SELF_EMPLOYED_FREELANCER") && !has(snapshot.expertise)) {
    gaps.push("FREELANCE_DETAILS");
  }
  if (statuses.has("SEEKING_OPPORTUNITIES") && snapshot.desiredRolesCount === 0) {
    gaps.push("JOB_SEEKING_DETAILS");
  }
  if (statuses.has("BUSINESS_OWNER") && !snapshot.hasCompleteBusiness) {
    gaps.push("BUSINESS_DETAILS");
  }

  if (!snapshot.attested) gaps.push("ATTESTATION");

  return gaps;
}

export function isApplicationComplete(snapshot: ApplicationSnapshot, currentYear: number): boolean {
  return getApplicationGaps(snapshot, currentYear).length === 0;
}
