import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { listAuditEntries } from "@/features/audit/services/audit.service";
import { requireStaffRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Audit log", robots: { index: false, follow: false } };

/** Append-only history of decisions, role changes and settings. Entries hold identifiers only, never document contents. */
export default async function AuditPage() {
  await requireStaffRole(["MEMBERSHIP_ADMIN", "FINANCE_REVIEWER"]);
  const entries = await listAuditEntries(200);

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading as="h1" eyebrow="Governance" title="Audit log" description="The 200 most recent entries. Records cannot be edited or deleted." />
        {entries.length === 0 ? (
          <EmptyState title="No entries yet" description="Decisions and changes will be recorded here as staff act." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-border bg-brand-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Recent audit entries</caption>
              <thead className="border-b border-brand-border text-brand-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">When</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Entity</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{entry.action}</td>
                    <td className="px-4 py-3 font-mono text-xs">{entry.entityType} · {entry.entityId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{entry.actorId ?? "system"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </section>
  );
}
