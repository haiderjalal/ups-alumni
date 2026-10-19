import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ROUTES } from "@/constants/routes";
import { listListedBatchYears } from "@/features/batches/services/batch-catalog.service";
import { AccountStepForm } from "@/features/registration/components/account-step-form";
import { OnboardingProgress } from "@/features/registration/components/onboarding-progress";
import { PrivacyStepForm } from "@/features/registration/components/privacy-step-form";
import { ProfileStepForm } from "@/features/registration/components/profile-step-form";
import { ReviewStepForm } from "@/features/registration/components/review-step-form";
import { SchoolStepForm } from "@/features/registration/components/school-step-form";
import {
  isEditableApplicationState,
  isRegistrationStepSlug,
  nextStepSlug,
  REGISTRATION_STEPS,
  stepIndex,
  type RegistrationStepSlug,
} from "@/features/registration/domain/steps";
import { loadApplicationSnapshot } from "@/features/registration/services/application-snapshot.service";
import {
  accountDefaults,
  privacyDefaults,
  profileDefaults,
  reviewSummary,
  schoolDefaults,
} from "@/features/registration/services/step-defaults.service";
import { loadOnboardingSnapshot } from "@/features/registration/services/onboarding.service";
import { getEffectiveRegistrationFee } from "@/features/payments/services/fee.service";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Registration",
  robots: { index: false, follow: false },
};

interface OnboardingStepPageProps {
  params: Promise<{ step: string }>;
}

const STEP_TITLES: Record<RegistrationStepSlug, { title: string; intro: string }> = {
  account: {
    title: "Your account and personal details",
    intro: "Start with how we can reach you and where you live now. Your progress is saved as you go.",
  },
  school: {
    title: "Your school information",
    intro: "Choose the batch you completed Class 10 in. This is what places you with your classmates.",
  },
  profile: {
    title: "Your occupation and professional profile",
    intro: "Tell the network what you do now. Choose every status that applies to you.",
  },
  privacy: {
    title: "Visibility and preferences",
    intro: "Your contact details are private until you choose otherwise. You can change these later in settings.",
  },
  review: {
    title: "Review, fee and status",
    intro: "Check your answers, confirm the two statements, and submit. Payment comes after submission.",
  },
};

export default async function OnboardingStepPage({ params }: OnboardingStepPageProps) {
  const { step } = await params;
  if (!isRegistrationStepSlug(step)) {
    notFound();
  }

  const user = await requireUser();
  const snapshot = await loadOnboardingSnapshot(user.id);
  if (!snapshot || !isEditableApplicationState(snapshot.application.status)) {
    redirect(ROUTES.appStatus);
  }

  // The applicant may revisit completed steps and the next one, but never jump further ahead.
  const completedCount = Math.min(Math.max(snapshot.application.currentStep - 1, 0), REGISTRATION_STEPS.length - 1);
  if (stepIndex(step) > completedCount) {
    redirect(`${ROUTES.appOnboarding}/${REGISTRATION_STEPS[completedCount]?.slug ?? "account"}`);
  }

  const nextSlug = nextStepSlug(step);
  const nextHref = nextSlug ? `${ROUTES.appOnboarding}/${nextSlug}` : ROUTES.appStatus;
  const heading = STEP_TITLES[step];

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-10">
        <SectionHeading as="h1" eyebrow={`Step ${stepIndex(step) + 1} of ${REGISTRATION_STEPS.length}`} title={heading.title} description={heading.intro} />
        <OnboardingProgress currentSlug={step} completedCount={completedCount} />
        {await renderStep(step, snapshot, nextHref, user.id)}
      </Container>
    </section>
  );
}

async function renderStep(
  step: RegistrationStepSlug,
  snapshot: NonNullable<Awaited<ReturnType<typeof loadOnboardingSnapshot>>>,
  nextHref: string,
  userId: string,
) {
  switch (step) {
    case "account":
      return <AccountStepForm defaults={accountDefaults(snapshot)} nextHref={nextHref} />;
    case "school": {
      const listedYears = await listListedBatchYears();
      return <SchoolStepForm defaults={schoolDefaults(snapshot, listedYears)} listedYears={listedYears} nextHref={nextHref} />;
    }
    case "profile":
      return <ProfileStepForm defaults={profileDefaults(snapshot)} nextHref={nextHref} />;
    case "privacy":
      return <PrivacyStepForm defaults={privacyDefaults(snapshot)} nextHref={nextHref} />;
    case "review": {
      const [applicationSnapshot, fee, application] = await Promise.all([
        loadApplicationSnapshot(db, userId),
        getEffectiveRegistrationFee(),
        db.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
      ]);
      const summary = reviewSummary({ onboarding: snapshot, application: applicationSnapshot, feeMinor: fee.amountMinor });
      return (
        <ReviewStepForm
          summary={summary.rows}
          feeLabel={summary.feeLabel}
          missingItems={summary.missing}
          emailVerified={Boolean(application?.emailVerified)}
        />
      );
    }
  }
}
