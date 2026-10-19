import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { BatchChangeActions } from "@/features/admin/components/decision-forms";
import { AddBatchForm, BatchListToggle } from "@/features/admin/components/operations-forms";
import { listBatchesForAdmin, listPendingBatchChanges } from "@/features/admin/services/admin-operations.service";
import { requireStaffRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Batches", robots: { index: false, follow: false } };

export default async function AdminBatchesPage() {
  await requireStaffRole(["MEMBERSHIP_ADMIN"]);
  const [batches, changes] = await Promise.all([listBatchesForAdmin(), listPendingBatchChanges(50)]);

  return (
    <section className="space-y-12">
      <Container className="max-w-none space-y-12 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Membership"
          title="Batch catalog and corrections"
          description="Only listed batches appear as sign-up choices. Batch corrections from active members are checked here before they change anything."
        />

        <section aria-labelledby="catalog-heading" className="space-y-5">
          <h2 id="catalog-heading" className="font-display text-3xl font-semibold">Catalog</h2>
          <AddBatchForm />
          {batches.length === 0 ? (
            <EmptyState title="The catalog is empty" description="Add the matric years the school has confirmed. Until then, applicants use My batch is not listed." />
          ) : (
            <ul className="divide-y divide-brand-border rounded-2xl border border-brand-border bg-brand-surface">
              {batches.map((batch) => (
                <li key={batch.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="font-semibold">Batch {batch.year}{batch.label ? ` · ${batch.label}` : ""}</p>
                    <p className="text-sm text-brand-muted">
                      {batch._count.profiles} {batch._count.profiles === 1 ? "profile" : "profiles"} · {batch.isListed ? "listed for sign-up" : "hidden from sign-up"}
                    </p>
                  </div>
                  <BatchListToggle batchId={batch.id} listed={batch.isListed} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="changes-heading" className="space-y-5">
          <h2 id="changes-heading" className="font-display text-3xl font-semibold">Pending corrections</h2>
          {changes.length === 0 ? (
            <p className="text-brand-muted">No corrections are waiting.</p>
          ) : (
            <ul className="space-y-4">
              {changes.map((change) => (
                <li key={change.id} className="space-y-3 rounded-2xl border border-brand-border bg-brand-surface p-5">
                  <p className="font-semibold">
                    {change.user.name}: batch {change.user.profile?.matricYear ?? "not set"} → {change.requestedYear}
                  </p>
                  <p className="whitespace-pre-line text-sm">{change.reason}</p>
                  <p className="text-xs text-brand-muted">Requested {formatDateTime(change.createdAt)}</p>
                  <BatchChangeActions requestId={change.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </section>
  );
}
