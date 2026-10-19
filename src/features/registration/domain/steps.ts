/** Ordered registration steps. The URL slug is the public name; the index drives progress and resume. */

export const REGISTRATION_STEPS = [
  { slug: "account", label: "Account and personal details" },
  { slug: "school", label: "School information" },
  { slug: "profile", label: "Occupation and professional profile" },
  { slug: "privacy", label: "Visibility and preferences" },
  { slug: "review", label: "Review, fee and status" },
] as const;

export type RegistrationStepSlug = (typeof REGISTRATION_STEPS)[number]["slug"];

export const FIRST_STEP_SLUG: RegistrationStepSlug = "account";

export function isRegistrationStepSlug(value: string): value is RegistrationStepSlug {
  return REGISTRATION_STEPS.some((step) => step.slug === value);
}

/** Zero-based index. Used to decide how far the applicant has progressed. */
export function stepIndex(slug: RegistrationStepSlug): number {
  return REGISTRATION_STEPS.findIndex((step) => step.slug === slug);
}

/** The step after this one, or null on the review step. */
export function nextStepSlug(slug: RegistrationStepSlug): RegistrationStepSlug | null {
  const next = REGISTRATION_STEPS[stepIndex(slug) + 1];
  return next ? next.slug : null;
}

/** Applications may be edited only before they are submitted, or after staff request changes. */
export const EDITABLE_APPLICATION_STATES = ["DRAFT", "CHANGES_REQUESTED"] as const;

export function isEditableApplicationState(status: string): boolean {
  return (EDITABLE_APPLICATION_STATES as readonly string[]).includes(status);
}
