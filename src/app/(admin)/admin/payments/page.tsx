import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { ROUTES } from "@/constants/routes";
import { listPaymentAttemptsForReview } from "@/features/payments/services/finance-review.service";
import { formatRupees } from "@/lib/money";
import { requireStaffRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Payments to review", robots: { index: false, follow: false } };

export default async function PaymentQueuePage() {
  await requireStaffRole(["FINANCE_REVIEWER"]);
  const [submitted, recentRejected] = await Promise.all([
    listPaymentAttemptsForReview("SUBMITTED", 100),
    listPaymentAttemptsForReview("REJECTED", 10),
  ]);

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Finance"
          title="Payments to review"
          description="Each transfer is checked against the receiving-account statement before it is confirmed. Oldest first."
        />
        {submitted.length === 0 ? (
          <EmptyState title="Nothing waiting" description="New transfer evidence appears here as members submit it." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-border bg-brand-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Payment attempts awaiting review</caption>
              <thead className="border-b border-brand-border text-brand-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Order</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Member</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Method</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Amount</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Submitted</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {submitted.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono">{row.order.reference}</td>
                    <td className="px-4 py-3">{row.order.user.name}</td>
                    <td className="px-4 py-3">{row.method.replace(/_/g, " ").toLowerCase()}</td>
                    <td className="px-4 py-3">{formatRupees(row.amountMinor)}</td>
                    <td className="px-4 py-3">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link className="font-semibold text-brand-deep underline underline-offset-4" href={`${ROUTES.admin}/payments/${row.id}`}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recentRejected.length > 0 ? (
          <section aria-labelledby="rejected-heading" className="space-y-4">
            <h2 id="rejected-heading" className="font-display text-2xl font-semibold">Recently rejected</h2>
            <ul className="divide-y divide-brand-border rounded-xl border border-brand-border bg-brand-surface">
              {recentRejected.map((row) => (
                <li key={row.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
                  <span>{row.order.reference} · {row.order.user.name}</span>
                  <span className="text-brand-muted">{row.reviewedAt ? formatDateTime(row.reviewedAt) : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </section>
  );
}
