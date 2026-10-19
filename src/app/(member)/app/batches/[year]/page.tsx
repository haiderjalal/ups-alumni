import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { ROUTES } from "@/constants/routes";
import { listListedBatchYears } from "@/features/batches/services/batch-catalog.service";
import { searchDirectory, DIRECTORY_PAGE_SIZE } from "@/features/directory/services/directory.service";
import { db } from "@/lib/db";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = { title: "Batch", robots: { index: false, follow: false } };

interface BatchPageProps {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ page?: string }>;
}

/** Discoverable members of one batch. Uses the same privacy rules as the directory, so hidden members stay hidden. */
export default async function BatchPage({ params, searchParams }: BatchPageProps) {
  const { year: rawYear } = await params;
  const { page: rawPage } = await searchParams;
  const viewer = await requireActiveMember();

  const year = Number(rawYear);
  const listed = await listListedBatchYears();
  if (!Number.isInteger(year) || !listed.includes(year)) {
    notFound();
  }

  const page = Math.max(1, Math.min(Number(rawPage) || 1, 500));
  const [{ cards, total }, representative] = await Promise.all([
    searchDirectory(viewer.id, { batchYear: year, sort: "name", page }),
    db.roleAssignment.findFirst({
      where: { role: "BATCH_REPRESENTATIVE", revokedAt: null, batch: { year } },
      select: { user: { select: { name: true } } },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Batch"
          title={`Batch ${year}`}
          description={
            representative
              ? `Batch representative: ${representative.user.name}, appointed by the network team.`
              : "No batch representative has been appointed yet."
          }
        />
        {cards.length === 0 ? (
          <EmptyState
            title="No listed members yet"
            description="Members of this batch appear here once they choose to be listed in the directory."
            action={<Link className="font-semibold text-brand-deep underline underline-offset-4" href={ROUTES.appBatches}>All batches</Link>}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <li key={card.publicId}>
                <Link
                  href={`${ROUTES.appDirectory}/${card.publicId}`}
                  className="block rounded-2xl border border-brand-border bg-brand-surface p-5 transition-colors duration-200 hover:border-brand-deep focus-visible:outline-brand-deep"
                >
                  <span className="block font-display text-xl font-semibold">{card.name}</span>
                  <span className="mt-1 block text-sm text-brand-muted">{card.city ?? "City not shared"}</span>
                  <span className="mt-2 block text-sm">{card.headline}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pageCount > 1 ? (
          <p className="text-sm text-brand-muted">
            Page {page} of {pageCount}.{" "}
            {page > 1 ? <Link className="underline underline-offset-4" href={`${ROUTES.appBatches}/${year}?page=${page - 1}`}>Previous</Link> : null}{" "}
            {page < pageCount ? <Link className="underline underline-offset-4" href={`${ROUTES.appBatches}/${year}?page=${page + 1}`}>Next</Link> : null}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
