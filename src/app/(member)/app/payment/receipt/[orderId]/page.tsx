import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/shared/print-button";
import { SITE } from "@/constants/site";
import { db } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Payment receipt", robots: { index: false, follow: false } };

interface ReceiptPageProps {
  params: Promise<{ orderId: string }>;
}

/**
 * Printable payment receipt. Labelled as a receipt, not a tax invoice: the school has not supplied invoicing
 * details. Only the order owner can open it.
 */
export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { orderId } = await params;
  const user = await requireUser();
  const payment = await db.confirmedPayment.findFirst({
    where: { orderId, order: { userId: user.id } },
    select: {
      receiptNumber: true,
      amountMinor: true,
      method: true,
      transactionReference: true,
      confirmedAt: true,
      order: { select: { reference: true, user: { select: { name: true, email: true } } } },
    },
  });
  if (!payment) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-xl space-y-8 rounded-2xl border border-brand-border bg-white p-8 text-brand-ink print:border-0 print:p-0">
      <header className="space-y-2 border-b border-brand-border pb-6">
        <p className="text-sm uppercase tracking-[0.14em] text-brand-gold-text">{SITE.name}</p>
        <h1 className="font-display text-3xl font-semibold">Payment receipt</h1>
        <p className="text-sm text-brand-muted">This is a payment receipt. It is not a tax invoice.</p>
      </header>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-brand-muted">Receipt number</dt>
          <dd className="font-mono font-semibold">{payment.receiptNumber}</dd>
        </div>
        <div>
          <dt className="text-brand-muted">Order reference</dt>
          <dd className="font-mono font-semibold">{payment.order.reference}</dd>
        </div>
        <div>
          <dt className="text-brand-muted">Member</dt>
          <dd>{payment.order.user.name}</dd>
        </div>
        <div>
          <dt className="text-brand-muted">Confirmed on</dt>
          <dd>{formatDateTime(payment.confirmedAt)}</dd>
        </div>
        <div>
          <dt className="text-brand-muted">Amount</dt>
          <dd className="text-xl font-semibold">{formatRupees(payment.amountMinor)}</dd>
        </div>
        <div>
          <dt className="text-brand-muted">Transfer reference</dt>
          <dd className="font-mono">{payment.transactionReference}</dd>
        </div>
      </dl>
      <p className="text-sm leading-relaxed text-brand-muted">
        Registration fee, one-time. Payment was confirmed by a finance reviewer against the receiving-account statement.
      </p>
      <PrintButton />
    </article>
  );
}
