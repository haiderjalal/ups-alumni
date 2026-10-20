import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { FeeScheduleForm, ReceivingAccountForm } from "@/features/admin/components/operations-forms";
import { getEffectiveRegistrationFee } from "@/features/payments/services/fee.service";
import { listAllReceivingAccounts } from "@/features/payments/services/payment-setup.service";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type ManualPaymentMethod } from "@/features/payments/domain/payment-rules";
import { formatRupees } from "@/lib/money";
import { requireStaffRole } from "@/lib/session";

export const metadata: Metadata = { title: "Fees and accounts", robots: { index: false, follow: false } };

/**
 * Receiving accounts and the registration fee. Accounts stay inactive until the school enters real details; the
 * payment page shows a setup state until at least one account is active.
 */
export default async function FeesAndAccountsPage() {
  // Matches the save action, which already accepts SUPER_ADMIN, so the first administrator can set up payments.
  await requireStaffRole(["FINANCE_REVIEWER", "SUPER_ADMIN"]);
  const [accounts, fee] = await Promise.all([listAllReceivingAccounts(), getEffectiveRegistrationFee()]);

  return (
    <section className="space-y-12">
      <Container className="max-w-none space-y-12 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Finance"
          title="Fees and receiving accounts"
          description="Never enter account numbers you have not verified. Live payments stay disabled until an account is active with its title and number filled in."
        />

        <section aria-labelledby="accounts-heading" className="space-y-6">
          <h2 id="accounts-heading" className="font-display text-3xl font-semibold">Receiving accounts</h2>
          {accounts.length === 0 ? (
            <EmptyState title="No accounts configured" description="Members see a setup message on the payment page until an account is active." />
          ) : (
            <ul className="space-y-3 text-sm">
              {accounts.map((account) => (
                <li key={account.id} className="rounded-xl border border-brand-border bg-brand-surface px-5 py-3">
                  {PAYMENT_METHOD_LABELS[account.method as ManualPaymentMethod]} · {account.label} · {account.isActive ? "accepting payments" : "inactive"}
                </li>
              ))}
            </ul>
          )}
          {PAYMENT_METHODS.map((method) => {
            const existing = accounts.find((account) => account.method === method);
            return (
              <details key={method} className="rounded-2xl border border-brand-border bg-brand-surface p-5" open={!existing}>
                <summary className="cursor-pointer font-semibold">{PAYMENT_METHOD_LABELS[method]}</summary>
                <div className="mt-5">
                  <ReceivingAccountForm
                    initial={{
                      id: existing?.id ?? null,
                      method,
                      label: existing?.label ?? PAYMENT_METHOD_LABELS[method],
                      accountTitle: existing?.accountTitle ?? "",
                      accountIdentifier: existing?.accountIdentifier ?? "",
                      instructions: existing?.instructions ?? "",
                      isActive: existing?.isActive ?? false,
                      sortOrder: existing ? 0 : PAYMENT_METHODS.indexOf(method),
                    }}
                  />
                </div>
              </details>
            );
          })}
        </section>

        <section aria-labelledby="fee-heading" className="space-y-6">
          <h2 id="fee-heading" className="font-display text-3xl font-semibold">Registration fee</h2>
          <p className="text-brand-muted">
            Current fee: {formatRupees(fee.amountMinor)}{fee.effectiveFrom ? ` (in force since ${fee.effectiveFrom.toISOString().slice(0, 10)})` : " (launch default, no schedule recorded yet)"}.
          </p>
          <FeeScheduleForm currentLabel={formatRupees(fee.amountMinor)} />
        </section>
      </Container>
    </section>
  );
}
