import type { Metadata } from "next";

import { AccountStepForm } from "@/features/registration/components/account-step-form";
import { ProfileStepForm } from "@/features/registration/components/profile-step-form";
import { BatchCorrectionForm } from "@/features/profile/components/account-self-service";
import { accountDefaults, profileDefaults } from "@/features/registration/services/step-defaults.service";
import { loadOnboardingSnapshot } from "@/features/registration/services/onboarding.service";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { requireActiveMember } from "@/lib/session";
import { currentYearInZone } from "@/lib/time";

export const metadata: Metadata = { title: "Your profile", robots: { index: false, follow: false } };

/** Profile editing for members. Batch and school years are changed through review, never directly. */
export default async function ProfilePage() {
  const user = await requireActiveMember();
  const snapshot = await loadOnboardingSnapshot(user.id);
  if (!snapshot) {
    return null;
  }

  return (
    <section className="space-y-12">
      <Container className="max-w-3xl space-y-12 px-0">
        <SectionHeading as="h1" eyebrow="Profile" title="Your profile" description="Changes to these details appear straight away in the directory, subject to your visibility settings." />

        <section aria-labelledby="account-heading" className="space-y-6">
          <h2 id="account-heading" className="font-display text-3xl font-semibold">
            Personal details
          </h2>
          <AccountStepForm defaults={accountDefaults(snapshot)} nextHref="/app/profile" mode="profile" />
        </section>

        <section aria-labelledby="occupation-heading" className="space-y-6">
          <h2 id="occupation-heading" className="font-display text-3xl font-semibold">
            Occupation and skills
          </h2>
          <ProfileStepForm defaults={profileDefaults(snapshot)} nextHref="/app/profile" mode="profile" />
        </section>

        <section aria-labelledby="batch-heading" className="space-y-6 rounded-2xl border border-brand-border bg-brand-surface p-6">
          <h2 id="batch-heading" className="font-display text-3xl font-semibold">
            Batch and school details
          </h2>
          <p className="text-brand-muted">
            Your batch is {snapshot.profile.matricYear ?? "not set"}. Identity details are changed only after a reviewer
            checks the correction, so your classmates can rely on batch information.
          </p>
          <BatchCorrectionForm currentYear={snapshot.profile.matricYear ?? currentYearInZone()} />
        </section>
      </Container>
    </section>
  );
}
