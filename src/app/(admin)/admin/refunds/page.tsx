import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { RefundActions } from "@/features/admin/components/decision-forms";
import { listRefundQueue } from "@/features/payments/services/refund.service";
import { formatRupees } from "@/lib/money";
import { requireStaffRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Refunds", robots: { index: false, follow: false } };

export default async function RefundsPage() {
  await requireStaffRole(["FINANCE_REVIEWER"]);
  const rows = await listRefundQueue(["REQUESTED", "APPROVED", "FAILED"], 100);

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Finance"
          title="Refund queue"
          description="Requested refunds, approved transfers awaiting processing, and failed transfers. A refund is only recorded as processed once a transfer reference is entered."
        />
        {rows.length === 0 ? (
          <EmptyState title="No open refunds" description="Refund requests appear here when an application is rejected after payment, or when finance opens one." />
        ) : (
          <ul className="space-y-6">
            {rows.map((row) => (
              <li key={row.id} className="space-y-5 rounded-2xl border border-brand-border bg-brand-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-display text-2xl font-semibold">{row.order.user.name}</p>
                    <p className="text-sm text-brand-muted">
                      Order {row.order.reference} · {formatRupees(row.amountMinor)} · {row.source === "AUTOMATIC_REJECTION" ? "opened after rejection" : "opened manually"} · {formatDateTime(row.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-tint px-3 py-1 text-sm font-semibold">{row.status.toLowerCase()}</span>
                </div>
                <p className="text-sm leading-relaxed">{row.reason}</p>
                {row.failureReason ? <p className="text-sm text-brand-danger">Last failure: {row.failureReason}</p> : null}
                {row.status === "REQUESTED" || row.status === "APPROVED" || row.status === "FAILED" ? (
                  <RefundActions refundId={row.id} status={row.status} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
