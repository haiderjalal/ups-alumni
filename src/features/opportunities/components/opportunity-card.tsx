import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/lib/time";

import { OPPORTUNITY_CATEGORY_LABELS, REMOTE_TYPE_LABELS } from "../constants";
import type { OpportunityCard as OpportunityCardData } from "../services/opportunity-directory.service";

export function OpportunityCard({
  opportunity,
}: {
  opportunity: OpportunityCardData;
}) {
  const details = [
    OPPORTUNITY_CATEGORY_LABELS[opportunity.category],
    REMOTE_TYPE_LABELS[opportunity.remoteType],
    opportunity.locationCity,
  ].filter(Boolean);

  return (
    <article className="flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
      <p className="text-sm font-medium text-brand-muted break-words">
        {details.join(" · ")}
      </p>
      <h2 className="font-display text-xl font-semibold leading-snug break-words">
        <Link
          href={`${ROUTES.appOpportunities}/${opportunity.id}`}
          className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          {opportunity.title}
        </Link>
      </h2>
      <p className="text-sm text-brand-ink break-words">
        {opportunity.organization}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm text-brand-muted">
        {opportunity.deadline ? (
          <span>Apply by {formatDate(opportunity.deadline)}</span>
        ) : (
          <span>Open deadline</span>
        )}
        {opportunity.saved ? (
          <span className="font-semibold text-brand-deep">Saved</span>
        ) : null}
      </div>
    </article>
  );
}
