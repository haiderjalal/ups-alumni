import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { PaginationLinks } from "@/features/businesses/components/pagination-links";
import { OpportunityCard } from "@/features/opportunities/components/opportunity-card";
import { OpportunityFilters } from "@/features/opportunities/components/opportunity-filters";
import { listLiveOpportunities } from "@/features/opportunities/services/opportunity-directory.service";
import { parseOpportunityQuery } from "@/features/opportunities/validation/opportunity.schema";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = {
  title: "Opportunities",
  robots: { index: false, follow: false },
};

interface OpportunitiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OpportunitiesPage({
  searchParams,
}: OpportunitiesPageProps) {
  const user = await requireActiveMember();
  const query = parseOpportunityQuery(await searchParams);
  const result = await listLiveOpportunities(user.id, query);

  const hasFilters = Boolean(
    query.q || query.category || query.remoteType || query.savedOnly,
  );
  const pageQuery: Record<string, string> = {};
  if (query.q) pageQuery.q = query.q;
  if (query.category) pageQuery.category = query.category;
  if (query.remoteType) pageQuery.remote = query.remoteType;
  if (query.savedOnly) pageQuery.saved = "1";

  return (
    <section className="py-10 md:py-14">
      <Container className="space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            as="h1"
            eyebrow="Members"
            title="Jobs and opportunities"
            description={
              <p>
                Roles shared by alumni and partner organizations. Each listing
                links to the official application page.
              </p>
            }
          />
          <Button
            variant="outline"
            render={<Link href={`${ROUTES.appOpportunities}/new`} />}
          >
            Share an opportunity
          </Button>
        </div>

        <OpportunityFilters
          q={query.q}
          category={query.category}
          remoteType={query.remoteType}
          savedOnly={query.savedOnly}
        />

        {result.total === 0 ? (
          <EmptyState
            title={
              hasFilters
                ? "No opportunities match these filters"
                : "No open opportunities right now"
            }
            description={
              hasFilters
                ? "Try a different search or clear the filters."
                : "Check back soon. Opportunities appear here after staff review them."
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((opportunity) => (
              <li key={opportunity.id}>
                <OpportunityCard opportunity={opportunity} />
              </li>
            ))}
          </ul>
        )}

        <PaginationLinks
          basePath={ROUTES.appOpportunities}
          query={pageQuery}
          page={result.page}
          pageCount={result.pageCount}
        />
      </Container>
    </section>
  );
}
