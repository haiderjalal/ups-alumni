import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { ReportActions } from "@/features/admin/components/decision-forms";
import { listOpenReports } from "@/features/reports/services/report.service";
import { requireStaffRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

/** Moderation queue. Reporters are never shown to the reported member, and reported content is referenced by id only. */
export default async function ReportsPage() {
  await requireStaffRole(["CONTENT_MODERATOR", "MEMBERSHIP_ADMIN"]);
  const reports = await listOpenReports(100);

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading as="h1" eyebrow="Moderation" title="Open reports" description="Oldest first. Action the report only after reviewing the content it points to." />
        {reports.length === 0 ? (
          <EmptyState title="No open reports" description="Reports from members appear here for review." />
        ) : (
          <ul className="space-y-4">
            {reports.map((report) => (
              <li key={report.id} className="space-y-3 rounded-2xl border border-brand-border bg-brand-surface p-5">
                <p className="font-semibold">
                  {report.targetType.toLowerCase().replace(/_/g, " ")} · {report.reason}
                </p>
                <p className="font-mono text-xs text-brand-muted">Target {report.targetId}</p>
                <p className="text-xs text-brand-muted">Reported {formatDateTime(report.createdAt)}</p>
                <ReportActions reportId={report.id} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
