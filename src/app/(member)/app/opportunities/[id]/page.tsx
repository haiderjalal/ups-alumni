import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { ROUTES } from "@/constants/routes";
import { SaveOpportunityButton } from "@/features/opportunities/components/save-opportunity-button";
import {
  OPPORTUNITY_CATEGORY_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  REMOTE_TYPE_LABELS,
} from "@/features/opportunities/constants";
import { getOpportunityForViewer } from "@/features/opportunities/services/opportunity-directory.service";
import { requireActiveMember } from "@/lib/session";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Opportunity",
  robots: { index: false, follow: false },
};

interface OpportunityDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OpportunityDetailPage({
  params,
}: OpportunityDetailPageProps) {
  const user = await requireActiveMember();
  const { id } = await params;
  const opportunity = await getOpportunityForViewer(id, user.id);
  if (!opportunity) {
    notFound();
  }

  const canApply = opportunity.isLive && opportunity.applicationUrl !== null;
  const posterStatus =
    opportunity.status === "PUBLISHED"
      ? "Deadline has passed"
      : OPPORTUNITY_STATUS_LABELS[opportunity.status];

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-10">
        <Link
          href={ROUTES.appOpportunities}
          className="inline-block text-sm font-semibold text-brand-deep underline underline-offset-4"
        >
          Back to opportunities
        </Link>

        {opportunity.isPoster && !opportunity.isLive ? (
          <p
            role="status"
            className="rounded-xl border border-brand-border bg-brand-sage px-4 py-3 text-sm text-brand-ink"
          >
            Only you can see this opportunity. Status:{" "}
            <strong>{posterStatus}</strong>.
          </p>
        ) : null}

        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-gold-text break-words">
            {[
              OPPORTUNITY_CATEGORY_LABELS[opportunity.category],
              REMOTE_TYPE_LABELS[opportunity.remoteType],
              opportunity.locationCity,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight break-words">
            {opportunity.title}
          </h1>
          <p className="text-lg text-brand-ink break-words">
            {opportunity.organization}
          </p>
        </header>

        <dl className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-sm font-semibold text-brand-muted">
              Application deadline
            </dt>
            <dd className="text-base">
              {opportunity.deadline
                ? formatDate(opportunity.deadline)
                : "Open until filled"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm font-semibold text-brand-muted">
              Posted by
            </dt>
            <dd className="text-base break-words">
              {opportunity.postedByName}
            </dd>
          </div>
        </dl>

        <section aria-labelledby="description-heading" className="space-y-3">
          <h2
            id="description-heading"
            className="font-display text-2xl font-semibold"
          >
            About this opportunity
          </h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-brand-muted break-words">
            {opportunity.description}
          </p>
        </section>

        <section
          aria-labelledby="apply-heading"
          className="space-y-4 rounded-2xl bg-brand-sage p-6"
        >
          <h2
            id="apply-heading"
            className="font-display text-2xl font-semibold"
          >
            How to apply
          </h2>
          {canApply ? (
            <>
              <p className="text-brand-ink">
                Applications are made on the organization&apos;s own page. You
                will leave the alumni network when you open the link.
              </p>
              <a
                href={opportunity.applicationUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-9 items-center rounded-lg bg-brand-deep px-4 text-sm font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
              >
                Apply on the organization&apos;s website
              </a>
            </>
          ) : (
            <p className="text-brand-ink">
              {opportunity.isLive
                ? "The application link cannot be shown right now."
                : "Applications for this opportunity are closed."}
            </p>
          )}

          {opportunity.isLive && !opportunity.isPoster ? (
            <SaveOpportunityButton
              opportunityId={opportunity.id}
              initiallySaved={opportunity.saved}
            />
          ) : null}
        </section>
      </Container>
    </section>
  );
}
