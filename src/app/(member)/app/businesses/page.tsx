import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { BusinessCard } from "@/features/businesses/components/business-card";
import { BusinessDirectoryFilters } from "@/features/businesses/components/business-directory-filters";
import { PaginationLinks } from "@/features/businesses/components/pagination-links";
import {
  listDirectoryFacets,
  listPublishedBusinesses,
} from "@/features/businesses/services/business-directory.service";
import { parseBusinessDirectoryQuery } from "@/features/businesses/validation/business.schema";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = {
  title: "Alumni businesses",
  robots: { index: false, follow: false },
};

interface BusinessesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BusinessesPage({
  searchParams,
}: BusinessesPageProps) {
  await requireActiveMember();
  const filters = parseBusinessDirectoryQuery(await searchParams);
  const [directory, facets] = await Promise.all([
    listPublishedBusinesses(filters),
    listDirectoryFacets(),
  ]);

  const hasFilters = Boolean(filters.sector || filters.city);
  const query: Record<string, string> = {
    ...(filters.sector ? { sector: filters.sector } : {}),
    ...(filters.city ? { city: filters.city } : {}),
  };

  return (
    <section className="py-10 md:py-14">
      <Container className="space-y-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            as="h1"
            eyebrow="Members"
            title="Alumni businesses"
            description={
              <p>
                Businesses run by fellow alumni. Contact details appear only
                when the owner chooses to publish them.
              </p>
            }
          />
          <Button
            variant="outline"
            render={<Link href={`${ROUTES.appBusinesses}/manage`} />}
          >
            Manage your listing
          </Button>
        </div>

        <BusinessDirectoryFilters
          sectors={facets.sectors}
          cities={facets.cities}
          selectedSector={filters.sector}
          selectedCity={filters.city}
        />

        {directory.total === 0 ? (
          <EmptyState
            title={
              hasFilters
                ? "No businesses match these filters"
                : "No businesses listed yet"
            }
            description={
              hasFilters
                ? "Try another sector or city, or clear the filters to see every published listing."
                : "Alumni businesses appear here once staff have approved them. You can list your own business from the manage page."
            }
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  render={<Link href={ROUTES.appBusinesses} />}
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  variant="outline"
                  render={<Link href={`${ROUTES.appBusinesses}/manage`} />}
                >
                  List your business
                </Button>
              )
            }
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {directory.items.map((business) => (
              <li key={business.slug}>
                <BusinessCard business={business} />
              </li>
            ))}
          </ul>
        )}

        <PaginationLinks
          basePath={ROUTES.appBusinesses}
          query={query}
          page={directory.page}
          pageCount={directory.pageCount}
        />
      </Container>
    </section>
  );
}
