"use server";

import { requireUser } from "@/lib/session";
import type { ActionResult } from "@/types/action";
import { actionError } from "@/types/action";

import type { RegistrationStepSlug } from "../domain/steps";
import { isSavableStep } from "../validation/registration.schema";
import { continueStep, saveStepDraft, submitApplication, updateProfileSection, type ProfileSection } from "../services/onboarding.service";

/** Autosave for one step. Accepts any signed-in member, pending or active, while the application is editable. */
export async function saveStepDraftAction(step: string, values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (!isSavableStep(step)) {
    return actionError("This step cannot be saved.");
  }
  return saveStepDraft({ userId: user.id, step, values });
}

/** Strict validation and save for one step. Returns the next step so the client can move forward. */
export async function continueStepAction(
  step: string,
  values: unknown,
): Promise<ActionResult<{ nextStep: RegistrationStepSlug | null }>> {
  const user = await requireUser();
  if (!isSavableStep(step)) {
    return actionError("This step cannot be saved.");
  }
  return continueStep({ userId: user.id, step, values });
}

export async function submitApplicationAction(attestations: unknown): Promise<ActionResult<{ status: string }>> {
  const user = await requireUser();
  const result = await submitApplication({ userId: user.id, attestations });
  if (!result.ok) {
    return result;
  }
  return { ok: true, data: { status: result.data.status } };
}


/** Saves one profile section after onboarding. Used by the profile and settings pages, not by the stepper. */
export async function updateProfileSectionAction(
  section: ProfileSection,
  values: unknown,
): Promise<ActionResult<{ nextStep: RegistrationStepSlug | null }>> {
  const user = await requireUser();
  return updateProfileSection({ userId: user.id, section, values });
}
