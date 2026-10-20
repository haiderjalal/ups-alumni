import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { MentorRequestForm } from "@/features/mentorship/components/mentor-request-form";
import { getMentorForViewer } from "@/features/mentorship/services/mentor-directory.service";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mentor profile",
  robots: { index: false, follow: false },
};

interface MentorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MentorDetailPage({
  params,
}: MentorDetailPageProps) {
  const user = await requireActiveMember();
  const { id } = await params;
  const mentor = await getMentorForViewer(id, user.id);
  if (!mentor) {
    notFound();
  }

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-10">
        <Link
          href={ROUTES.appMentorship}
          className="inline-block text-sm font-semibold text-brand-deep underline underline-offset-4"
        >
          Back to mentorship
        </Link>

        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-violet">
            Mentor
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight break-words">
            {mentor.name}
          </h1>
          <p className="text-sm text-brand-muted">
            {mentor.acceptingRequests
              ? "Accepting requests"
              : "At capacity right now"}
          </p>
        </header>

        <section aria-labelledby="expertise-heading" className="space-y-3">
          <h2
            id="expertise-heading"
            className="font-display text-2xl font-semibold"
          >
            Expertise
          </h2>
          <p className="whitespace-pre-line leading-relaxed text-brand-muted break-words">
            {mentor.expertise}
          </p>
        </section>

        <dl className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-sm font-semibold text-brand-muted">Topics</dt>
            <dd className="text-base capitalize break-words">
              {mentor.topics.join(", ")}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-semibold text-brand-muted">
              Languages
            </dt>
            <dd className="text-base break-words">
              {mentor.languages.length > 0
                ? mentor.languages.join(", ")
                : "Not specified"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-semibold text-brand-muted">
              Availability
            </dt>
            <dd className="text-base break-words">{mentor.availability}</dd>
          </div>
        </dl>

        <section
          aria-labelledby="request-heading"
          className="space-y-4 rounded-2xl bg-brand-lilac p-6"
        >
          <h2
            id="request-heading"
            className="font-display text-2xl font-semibold"
          >
            Request mentorship
          </h2>
          <RequestPanel mentor={mentor} />
        </section>
      </Container>
    </section>
  );
}

function RequestPanel({
  mentor,
}: {
  mentor: {
    profileId: string;
    isSelf: boolean;
    canRequest: boolean;
    hasPendingRequest: boolean;
    hasActiveMentorship: boolean;
  };
}) {
  if (mentor.isSelf) {
    return (
      <div className="space-y-4">
        <p className="text-brand-ink">This is your mentor profile.</p>
        <Button
          variant="outline"
          render={<Link href={`${ROUTES.appMentorship}/profile`} />}
        >
          Edit your mentor profile
        </Button>
      </div>
    );
  }
  if (mentor.hasActiveMentorship) {
    return (
      <p className="text-brand-ink">
        You already have an active mentorship with this mentor. See it on your
        requests page.
      </p>
    );
  }
  if (mentor.hasPendingRequest) {
    return (
      <p className="text-brand-ink">
        Your request is waiting for this mentor&apos;s decision.
      </p>
    );
  }
  if (!mentor.canRequest) {
    return (
      <p className="text-brand-ink">
        This mentor is not accepting requests right now.
      </p>
    );
  }
  return <MentorRequestForm mentorProfileId={mentor.profileId} />;
}
