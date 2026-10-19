import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { MentorProfileForm } from "@/features/mentorship/components/mentor-profile-form";
import { getOwnMentorProfile } from "@/features/mentorship/services/mentor-profile.service";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your mentor profile",
  robots: { index: false, follow: false },
};

export default async function MentorProfilePage() {
  const user = await requireActiveMember();
  const profile = await getOwnMentorProfile(user.id);

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-10">
        <SectionHeading
          as="h1"
          eyebrow="Mentorship"
          title="Offer mentorship"
          description={
            <p>
              Share your experience with fellow alumni. Your profile appears in
              mentor search only while it is turned on.
            </p>
          }
        />

        {profile ? (
          <p
            role="status"
            className="rounded-xl border border-brand-border bg-brand-sage px-4 py-3 text-sm text-brand-ink"
          >
            You have {profile.activeMentorships} active mentorship
            {profile.activeMentorships === 1 ? "" : "s"}.
          </p>
        ) : null}

        <MentorProfileForm initial={profile} />
      </Container>
    </section>
  );
}
