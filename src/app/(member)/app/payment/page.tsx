import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ROUTES } from "@/constants/routes";
import { PaymentPanel } from "@/features/payments/components/payment-panel";
import { PAYMENT_METHOD_LABELS, type ManualPaymentMethod } from "@/features/payments/domain/payment-rules";
import { getPaymentOverview } from "@/features/payments/services/order.service";
import { listActiveReceivingAccounts } from "@/features/payments/services/payment-setup.service";
import { db } from "@/lib/db";
import { formatRupees } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Registration fee", robots: { index: false, follow: false } };

export default async function PaymentPage() {
  const user = await requireUser();
  const overview = await getPaymentOverview(user.id);
  const accounts = await listActiveReceivingAccounts();

  const orderInstructions = overview.order?.receivingAccountId
    ? await db.receivingAccount.findUnique({ where: { id: overview.order.receivingAccountId }, select: { instructions: true } })
    : null;

  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());

  return (
    <section className="space-y-10">
      <Container className="max-w-3xl space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Registration fee"
          title="Pay your one-time fee"
          description={`The registration fee is ${formatRupees(overview.feeMinor)}, paid once by bank or wallet transfer. Manual payments are checked by a finance reviewer before they count.`}
        />
        <PaymentPanel
          feeLabel={formatRupees(overview.feeMinor)}
          todayIso={todayIso}
          blockedReason={overview.blockedReason}
          accounts={accounts.map((account) => ({
            id: account.id,
            method: account.method as ManualPaymentMethod,
            label: account.label,
            accountTitle: account.accountTitle,
            accountIdentifier: account.accountIdentifier,
            instructions: account.instructions,
          }))}
          order={
            overview.order
              ? {
                  id: overview.order.id,
                  reference: overview.order.reference,
                  status: overview.order.status,
                  amountLabel: formatRupees(overview.order.amountMinor),
                  amountRupees: overview.order.amountMinor / 100,
                  method: overview.order.receivingMethod as ManualPaymentMethod | null,
                  accountTitle: overview.order.receivingTitle,
                  accountIdentifier: overview.order.receivingIdentifier,
                  instructions: orderInstructions?.instructions ?? null,
                }
              : null
          }
          attempts={overview.attempts.map((attempt) => ({
            id: attempt.id,
            status: attempt.status,
            transactionReference: attempt.transactionReference,
            dateLabel: `${formatDate(attempt.paidOn)} · ${formatRupees(attempt.amountMinor)}`,
            reviewNote: attempt.reviewNote,
          }))}
          receiptHref={overview.order ? `${ROUTES.appPayment}/receipt/${overview.order.id}` : null}
        />
        {overview.order ? (
          <p className="text-sm text-brand-muted">
            Paying by {overview.order.receivingMethod ? PAYMENT_METHOD_LABELS[overview.order.receivingMethod] : "transfer"}.
          </p>
        ) : null}
      </Container>
    </section>
  );
}
