import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ChangePasswordForm, ClosureRequestButton } from "@/features/profile/components/account-self-service";
import { PrivacyStepForm } from "@/features/registration/components/privacy-step-form";
import { privacyDefaults } from "@/features/registration/services/step-defaults.service";
import { loadOnboardingSnapshot } from "@/features/registration/services/onboarding.service";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

/** Privacy, communication preferences, password, data export and account closure. */
export default async function SettingsPage() {
  const user = await requireUser();
  const snapshot = await loadOnboardingSnapshot(user.id);
  if (!snapshot) {
    return null;
  }

  return (
    <section className="space-y-12">
      <Container className="max-w-3xl space-y-12 px-0">
        <SectionHeading as="h1" eyebrow="Settings" title="Privacy, preferences and account" />

        <section aria-labelledby="privacy-heading" className="space-y-6">
          <h2 id="privacy-heading" className="font-display text-3xl font-semibold">
            Visibility and communication
          </h2>
          <PrivacyStepForm defaults={privacyDefaults(snapshot)} nextHref="/app/settings" mode="profile" />
        </section>

        <section aria-labelledby="password-heading" className="space-y-6">
          <h2 id="password-heading" className="font-display text-3xl font-semibold">
            Password
          </h2>
          <ChangePasswordForm />
        </section>

        <section aria-labelledby="data-heading" className="space-y-6">
          <h2 id="data-heading" className="font-display text-3xl font-semibold">
            Your data
          </h2>
          <p className="text-brand-muted">
            Download a copy of your own records as a file. It includes your profile, application status, payment history
            and notifications. It never includes another member&apos;s data.
          </p>
          <Button variant="outline" render={<a href="/api/account/export" />}>
            Download my data
          </Button>
          <ClosureRequestButton />
          <p className="text-sm text-brand-muted">
            Need help? <Link className="underline underline-offset-4" href="/contact">Contact the network team</Link>.
          </p>
        </section>
      </Container>
    </section>
  );
}
