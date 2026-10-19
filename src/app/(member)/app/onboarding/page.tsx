import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { loadOnboardingSnapshot } from "@/features/registration/services/onboarding.service";
import { FIRST_STEP_SLUG, REGISTRATION_STEPS } from "@/features/registration/domain/steps";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Registration", robots: { index: false, follow: false } };

/** Sends the applicant to the first step they have not completed, or to status once submitted. */
export default async function OnboardingIndexPage() {
  const user = await requireUser();
  const snapshot = await loadOnboardingSnapshot(user.id);
  if (!snapshot || snapshot.application.status !== "DRAFT") {
    redirect(ROUTES.appStatus);
  }
  const resumeIndex = Math.min(Math.max(snapshot.application.currentStep - 1, 0), REGISTRATION_STEPS.length - 1);
  const slug = REGISTRATION_STEPS[resumeIndex]?.slug ?? FIRST_STEP_SLUG;
  redirect(`${ROUTES.appOnboarding}/${slug}`);
}
