import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { ROUTES } from "@/constants/routes";
import { listListedBatchYears } from "@/features/batches/services/batch-catalog.service";
import { countDiscoverableByBatch } from "@/features/directory/services/directory.service";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = { title: "Batches", robots: { index: false, follow: false } };

export default async function BatchesPage() {
  await requireActiveMember();
  const [years, counts] = await Promise.all([listListedBatchYears(), countDiscoverableByBatch()]);

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Batches"
          title="Find your classmates"
          description="Each batch groups alumni by the year they completed Class 10. Counts include only members who chose to be listed."
        />
        {years.length === 0 ? (
          <EmptyState title="No batches are listed yet" description="The network team adds batches to the catalog. Check back once the school has published them." />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {years.map((year) => (
              <li key={year}>
                <Link
                  href={`${ROUTES.appBatches}/${year}`}
                  className="block rounded-2xl border border-brand-border bg-brand-surface p-6 transition-colors duration-200 hover:border-brand-deep focus-visible:outline-brand-deep"
                >
                  <span className="block font-display text-3xl font-semibold">Batch {year}</span>
                  <span className="mt-2 block text-sm text-brand-muted">
                    {counts.get(year) ?? 0} {counts.get(year) === 1 ? "listed member" : "listed members"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
