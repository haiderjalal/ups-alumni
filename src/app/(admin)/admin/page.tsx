import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { SITE } from "@/constants/site";
import { db } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { requireStaffRole } from "@/lib/session";

export const metadata: Metadata = { title: "Admin overview", robots: { index: false, follow: false } };

interface MetricProps {
  label: string;
  value: string;
  definition: string;
}

function Metric({ label, value, definition }: MetricProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-brand-border bg-brand-surface p-6">
      <p className="text-sm font-semibold text-brand-muted">{label}</p>
      <p className="font-display text-4xl font-semibold">{value}</p>
      <p className="text-xs leading-relaxed text-brand-muted">{definition}</p>
    </div>
  );
}

/**
 * Operational overview. Each figure has a written definition. Revenue counts confirmed payments only, so pending
 * and rejected attempts never inflate it, and refunds are subtracted only once they are processed.
 */
export default async function AdminOverviewPage() {
  const staff = await requireStaffRole(["MEMBERSHIP_ADMIN", "FINANCE_REVIEWER", "CONTENT_MODERATOR", "BATCH_REPRESENTATIVE", "GROUP_REPRESENTATIVE"]);
  const canSeeFinance = staff.roles.some((role) => role === "FINANCE_REVIEWER" || role === "SUPER_ADMIN");
  const canSeeMembership = staff.roles.some((role) => role === "MEMBERSHIP_ADMIN" || role === "SUPER_ADMIN");

  const [active, pendingApplications, pendingPayments, confirmedRevenue, processedRefunds, openRefunds] = await Promise.all([
    canSeeMembership ? db.membership.count({ where: { status: "ACTIVE" } }) : Promise.resolve(0),
    canSeeMembership ? db.alumniApplication.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] } } }) : Promise.resolve(0),
    canSeeFinance ? db.paymentAttempt.count({ where: { status: "SUBMITTED" } }) : Promise.resolve(0),
    canSeeFinance ? db.confirmedPayment.aggregate({ _sum: { amountMinor: true } }) : Promise.resolve({ _sum: { amountMinor: 0 } }),
    canSeeFinance ? db.refund.aggregate({ where: { status: "PROCESSED" }, _sum: { amountMinor: true } }) : Promise.resolve({ _sum: { amountMinor: 0 } }),
    canSeeFinance ? db.refund.count({ where: { status: { in: ["REQUESTED", "APPROVED", "FAILED"] } } }) : Promise.resolve(0),
  ]);

  const confirmed = confirmedRevenue._sum.amountMinor ?? 0;
  const refunded = processedRefunds._sum.amountMinor ?? 0;

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading as="h1" eyebrow={SITE.name} title="Overview" description="Figures are calculated from the database each time this page loads." />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {canSeeMembership ? (
            <>
              <Metric label="Active members" value={String(active)} definition="Memberships with status ACTIVE." />
              <Metric label="Applications waiting" value={String(pendingApplications)} definition="Submitted, under review, or waiting on changes from the applicant." />
            </>
          ) : null}
          {canSeeFinance ? (
            <>
              <Metric label="Payments to review" value={String(pendingPayments)} definition="Payment attempts with status SUBMITTED." />
              <Metric label="Confirmed fee revenue" value={formatRupees(confirmed)} definition="Sum of confirmed payments. Pending and rejected attempts are excluded." />
              <Metric label="Refunds processed" value={formatRupees(refunded)} definition="Sum of refunds recorded as PROCESSED. Requests and approvals are not counted." />
              <Metric label="Refunds open" value={String(openRefunds)} definition="Refunds that are requested, approved, or failed and not yet processed." />
            </>
          ) : null}
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-brand-muted">
          Engagement metrics are not shown yet. They will be added once the analytics definitions are approved by the school.
        </p>
      </Container>
    </section>
  );
}
