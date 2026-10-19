import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { ROUTES } from "@/constants/routes";
import { OpportunitySubmitForm } from "@/features/opportunities/components/opportunity-submit-form";
import { OPPORTUNITY_STATUS_LABELS } from "@/features/opportunities/constants";
import { listOwnSubmissions } from "@/features/opportunities/services/opportunity-submission.service";
import { requireActiveMember } from "@/lib/session";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Share an opportunity",
  robots: { index: false, follow: false },
};

export default async function NewOpportunityPage() {
  const user = await requireActiveMember();
  const submissions = await listOwnSubmissions(user.id);

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-12">
        <SectionHeading
          as="h1"
          eyebrow="Opportunities"
          title="Share an opportunity"
          description={
            <p>
              Staff review every submission before it appears for members. Use
              the official https link to the application page.
            </p>
          }
        />

        <OpportunitySubmitForm />

        <section aria-labelledby="submissions-heading" className="space-y-6">
          <h2
            id="submissions-heading"
            className="font-display text-2xl font-semibold"
          >
            Your submissions
          </h2>
          {submissions.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              description="Opportunities you share appear here with their review status."
            />
          ) : (
            <ul className="space-y-3">
              {submissions.map((submission) => (
                <li
                  key={submission.id}
                  className="flex min-w-0 flex-col gap-2 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`${ROUTES.appOpportunities}/${submission.id}`}
                      className="font-semibold text-brand-deep underline underline-offset-4 break-words"
                    >
                      {submission.title}
                    </Link>
                    <p className="text-sm text-brand-muted">
                      Submitted {formatDate(submission.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-brand-ink">
                    {OPPORTUNITY_STATUS_LABELS[submission.status]}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </section>
  );
}
