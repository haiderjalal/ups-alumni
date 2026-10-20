import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { DirectoryFilterForm } from "@/features/directory/components/directory-filter-form";
import { DIRECTORY_PAGE_SIZE, searchDirectory, type DirectoryFilters } from "@/features/directory/services/directory.service";
import { ROUTES } from "@/constants/routes";
import { PROFESSIONAL_STATUS_VALUES } from "@/features/registration/validation/registration.schema";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = { title: "Directory", robots: { index: false, follow: false } };

interface DirectoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses URL search parameters into filters. Anything malformed is ignored rather than trusted. */
function parseFilters(params: Record<string, string | string[] | undefined>): DirectoryFilters {
  const batch = Number(first(params.batch));
  const status = first(params.status);
  const sort = first(params.sort);
  const page = Number(first(params.page));
  return {
    q: first(params.q)?.slice(0, 80),
    batchYear: Number.isInteger(batch) && batch > 1900 && batch < 2200 ? batch : undefined,
    city: first(params.city)?.slice(0, 80),
    industry: first(params.industry)?.slice(0, 80),
    status: (PROFESSIONAL_STATUS_VALUES as readonly string[]).includes(status ?? "") ? (status as DirectoryFilters["status"]) : undefined,
    skill: first(params.skill)?.slice(0, 60),
    mentorsOnly: first(params.mentors) === "1",
    hiringOnly: first(params.hiring) === "1",
    sort: sort === "batch_desc" || sort === "batch_asc" ? sort : "name",
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1,
  };
}

function queryString(filters: DirectoryFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.batchYear) params.set("batch", String(filters.batchYear));
  if (filters.city) params.set("city", filters.city);
  if (filters.industry) params.set("industry", filters.industry);
  if (filters.status) params.set("status", filters.status);
  if (filters.skill) params.set("skill", filters.skill);
  if (filters.mentorsOnly) params.set("mentors", "1");
  if (filters.hiringOnly) params.set("hiring", "1");
  if (filters.sort && filters.sort !== "name") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `?${text}` : "";
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
  const user = await requireActiveMember();
  const filters = parseFilters(await searchParams);
  const { cards, total } = await searchDirectory(user.id, filters);
  const page = filters.page ?? 1;
  const pageCount = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));

  return (
    <section className="space-y-8">
      <Container className="max-w-none space-y-8 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Directory"
          title="Find alumni"
          description="Only members who chose to be listed appear here. Contact details follow each member's own visibility settings."
        />
        <DirectoryFilterForm action={ROUTES.appDirectory} filters={filters} />

        <p role="status" className="text-sm text-brand-muted">
          {total === 0 ? "No members match these filters." : `${total} ${total === 1 ? "member" : "members"} found.`}
        </p>

        {cards.length === 0 ? (
          <EmptyState
            title="No matches yet"
            description="Try fewer filters, or search for a different batch. The directory grows as members choose to be listed."
            action={<Button variant="outline" render={<Link href={ROUTES.appDirectory} />}>Clear filters</Button>}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <li key={card.publicId}>
                <Link
                  href={`${ROUTES.appDirectory}/${card.publicId}`}
                  className="flex h-full gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 transition-colors duration-200 hover:border-brand-deep focus-visible:outline-brand-deep"
                >
                  <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-lavender font-display text-xl font-semibold text-brand-deep">
                    {card.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="block truncate font-display text-xl font-semibold">{card.name}</span>
                    <span className="block text-sm text-brand-muted">
                      {card.batchYear ? `Batch ${card.batchYear}` : "Batch not set"}
                      {card.city ? ` · ${card.city}` : ""}
                    </span>
                    <span className="block text-sm leading-snug">{card.headline}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pageCount > 1 ? (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-4">
            {page > 1 ? (
              <Button variant="outline" render={<Link href={`${ROUTES.appDirectory}${queryString(filters, page - 1)}`} />}>
                Previous
              </Button>
            ) : (
              <span />
            )}
            <p className="text-sm text-brand-muted">
              Page {page} of {pageCount}
            </p>
            {page < pageCount ? (
              <Button variant="outline" render={<Link href={`${ROUTES.appDirectory}${queryString(filters, page + 1)}`} />}>
                Next
              </Button>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Container>
    </section>
  );
}
