import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { PaymentDecisionForm } from "@/features/admin/components/decision-forms";
import { getPaymentAttemptForReview } from "@/features/payments/services/finance-review.service";
import { PAYMENT_METHOD_LABELS, type ManualPaymentMethod } from "@/features/payments/domain/payment-rules";
import { formatRupees } from "@/lib/money";
import { requireStaffRole } from "@/lib/session";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Review payment", robots: { index: false, follow: false } };

interface PaymentReviewPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function PaymentReviewPage({ params }: PaymentReviewPageProps) {
  await requireStaffRole(["FINANCE_REVIEWER"]);
  const { attemptId } = await params;
  const attempt = await getPaymentAttemptForReview(attemptId);
  if (!attempt) {
    notFound();
  }

  const amountMatches = attempt.amountMinor === attempt.order.amountMinor;
  const reviewable = attempt.status === "SUBMITTED";

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow={`Payment · ${attempt.status.toLowerCase()}`}
          title={`Order ${attempt.order.reference}`}
          description={`${attempt.order.user.name} · ${attempt.order.user.email}`}
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <dl className="grid gap-5 rounded-2xl border border-brand-border bg-brand-surface p-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Amount paid</dt>
              <dd className="text-xl font-semibold">{formatRupees(attempt.amountMinor)}</dd>
              {!amountMatches ? <dd className="text-sm font-semibold text-brand-danger">Does not match the order fee of {formatRupees(attempt.order.amountMinor)}.</dd> : null}
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Order fee</dt>
              <dd>{formatRupees(attempt.order.amountMinor)}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Transaction reference</dt>
              <dd className="font-mono">{attempt.transactionReference}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Date of transfer</dt>
              <dd>{formatDate(attempt.paidOn)}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Method and receiving account</dt>
              <dd>
                {PAYMENT_METHOD_LABELS[attempt.method as ManualPaymentMethod]}
                {attempt.receivingAccount ? ` · ${attempt.receivingAccount.accountTitle} (${attempt.receivingAccount.accountIdentifier})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Name on sending account</dt>
              <dd>{attempt.payerName ?? "Not given"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-semibold text-brand-muted">Receipt</dt>
              <dd>
                {attempt.receiptMediaId ? (
                  <a className="font-semibold text-brand-deep underline underline-offset-4" href={`/api/files/${attempt.receiptMediaId}`} target="_blank" rel="noopener noreferrer">
                    Open receipt in a new tab
                  </a>
                ) : (
                  "No receipt attached"
                )}
              </dd>
            </div>
            {attempt.reviewNote ? (
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-brand-muted">Review note</dt>
                <dd>{attempt.reviewNote}</dd>
              </div>
            ) : null}
            {attempt.reconciliationReference ? (
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-brand-muted">Statement reference</dt>
                <dd className="font-mono">{attempt.reconciliationReference}</dd>
              </div>
            ) : null}
          </dl>

          <section aria-labelledby="decide-heading" className="space-y-4">
            <h2 id="decide-heading" className="sr-only">Decision</h2>
            {reviewable ? (
              <PaymentDecisionForm attemptId={attempt.id} />
            ) : (
              <p className="rounded-xl border border-brand-border bg-brand-surface p-5 text-brand-muted">
                This attempt is {attempt.status.toLowerCase()}. Decisions are final for this record.
              </p>
            )}
          </section>
        </div>
      </Container>
    </section>
  );
}
