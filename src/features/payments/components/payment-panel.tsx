"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_UPLOAD_BYTES } from "@/features/media/domain/uploads";
import { createOrderAction, submitPaymentAttemptAction } from "../actions/payment.actions";
import { PAYMENT_METHOD_LABELS, type ManualPaymentMethod } from "../domain/payment-rules";

export interface PaymentPanelAccount {
  id: string;
  method: ManualPaymentMethod;
  label: string;
  accountTitle: string;
  accountIdentifier: string;
  instructions: string | null;
}

export interface PaymentPanelOrder {
  id: string;
  reference: string;
  status: "UNPAID" | "AWAITING_REVIEW" | "CONFIRMED" | "REFUNDED";
  amountLabel: string;
  amountRupees: number;
  method: ManualPaymentMethod | null;
  accountTitle: string | null;
  accountIdentifier: string | null;
  instructions: string | null;
}

export interface PaymentPanelAttempt {
  id: string;
  status: "SUBMITTED" | "CONFIRMED" | "REJECTED";
  transactionReference: string;
  dateLabel: string;
  reviewNote: string | null;
}

interface PaymentPanelProps {
  feeLabel: string;
  todayIso: string;
  blockedReason: string | null;
  accounts: PaymentPanelAccount[];
  order: PaymentPanelOrder | null;
  attempts: PaymentPanelAttempt[];
  receiptHref: string | null;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

async function uploadReceipt(file: File): Promise<{ ok: true; mediaId: string } | { ok: false; message: string }> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, message: "Upload a JPG, PNG, WebP image or a PDF." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "The file is larger than 5 MB. Upload a smaller file." };
  }

  const body = new FormData();
  body.append("kind", "RECEIPT");
  body.append("file", file);
  const response = await fetch("/api/uploads", { method: "POST", body, credentials: "same-origin" });
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; data?: { mediaId: string } } | null;
  if (!response.ok || !payload?.ok || !payload.data) {
    return { ok: false, message: payload?.message ?? "The receipt could not be uploaded. Try again." };
  }
  return { ok: true, mediaId: payload.data.mediaId };
}

interface EvidenceValues {
  transactionReference: string;
  amountRupees: string;
  paidOn: string;
  payerName: string;
}

function PaymentEvidenceForm({ order, todayIso }: { order: PaymentPanelOrder; todayIso: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<File | null>(null);

  const form = useForm<EvidenceValues>({
    defaultValues: { transactionReference: "", amountRupees: String(order.amountRupees), paidOn: todayIso, payerName: "" },
  });
  const { errors } = form.formState;
  const fieldError = (name: string): string | undefined =>
    (name in errors ? errors[name as keyof EvidenceValues]?.message : undefined) ?? fieldErrors[name];

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    setFieldErrors({});
    if (!receipt) {
      setFieldErrors({ receiptMediaId: "Upload a screenshot or PDF of your receipt." });
      return;
    }
    startTransition(async () => {
      const upload = await uploadReceipt(receipt);
      if (!upload.ok) {
        setFieldErrors({ receiptMediaId: upload.message });
        return;
      }
      const result = await submitPaymentAttemptAction({
        orderId: order.id,
        transactionReference: values.transactionReference,
        amountRupees: values.amountRupees,
        paidOn: values.paidOn,
        payerName: values.payerName,
        receiptMediaId: upload.mediaId,
      });
      if (!result.ok) {
        setFormError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormAlert tone="error" message={formError} />
      <p className="text-sm leading-relaxed text-brand-muted">
        Submitting evidence does not confirm your payment. A finance reviewer checks each transfer against the
        receiving-account statement before the fee is marked as paid.
      </p>

      <FormField id="transactionReference" label="Transaction reference" required error={fieldError("transactionReference")} hint="The reference or transaction ID from your bank or wallet receipt.">
        <Input id="transactionReference" autoComplete="off" aria-invalid={Boolean(fieldError("transactionReference"))} aria-describedby={describedBy("transactionReference", "hint", fieldError("transactionReference"))} {...form.register("transactionReference", { required: "Enter the transaction reference from your transfer." })} />
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="amountRupees" label="Amount paid (PKR)" required error={fieldError("amountRupees")} hint="Must match the fee on your order.">
          <Input id="amountRupees" inputMode="decimal" aria-invalid={Boolean(fieldError("amountRupees"))} aria-describedby={describedBy("amountRupees", "hint", fieldError("amountRupees"))} {...form.register("amountRupees", { required: "Enter the amount you paid." })} />
        </FormField>
        <FormField id="paidOn" label="Date of transfer" required error={fieldError("paidOn")}>
          <Input id="paidOn" type="date" max={todayIso} aria-invalid={Boolean(fieldError("paidOn"))} aria-describedby={describedBy("paidOn", undefined, fieldError("paidOn"))} {...form.register("paidOn", { required: "Enter the date of the transfer." })} />
        </FormField>
      </div>

      <FormField id="payerName" label="Name on the sending account" hint="Optional. Helps the reviewer match the transfer.">
        <Input id="payerName" aria-describedby={describedBy("payerName", "hint", undefined)} {...form.register("payerName")} />
      </FormField>

      <FormField id="receipt" label="Receipt (screenshot or PDF)" required error={fieldError("receiptMediaId")} hint="JPG, PNG, WebP or PDF, up to 5 MB. Only finance reviewers can open it.">
        <input
          id="receipt"
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          aria-invalid={Boolean(fieldError("receiptMediaId"))}
          aria-describedby={describedBy("receipt", "hint", fieldError("receiptMediaId"))}
          onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-sage file:px-4 file:py-2 file:font-semibold"
        />
      </FormField>

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Sending your evidence…" : "Submit payment evidence"}
      </Button>
    </form>
  );
}

function CreateOrderForm({ accounts }: { accounts: PaymentPanelAccount[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string>(accounts[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold">Choose where to pay</legend>
        {accounts.map((account) => (
          <label key={account.id} className="flex items-start gap-3 rounded-xl border border-brand-border bg-brand-surface p-4">
            <input
              type="radio"
              name="receivingAccount"
              value={account.id}
              checked={selected === account.id}
              onChange={() => setSelected(account.id)}
              className="mt-1 size-4 accent-brand-deep"
            />
            <span>
              <span className="block font-semibold">{PAYMENT_METHOD_LABELS[account.method]}</span>
              <span className="block text-sm text-brand-muted">{account.label}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <FormAlert tone="error" message={message} />
      <Button
        size="lg"
        disabled={isPending || !selected}
        onClick={() =>
          startTransition(async () => {
            const result = await createOrderAction(selected);
            if (!result.ok) {
              setMessage(result.message);
              return;
            }
            router.refresh();
          })
        }
      >
        {isPending ? "Creating your payment reference…" : "Create my payment reference"}
      </Button>
    </div>
  );
}

/** Payment flow for one order: choose an account, pay by transfer, submit evidence, then follow the review. */
export function PaymentPanel(props: PaymentPanelProps) {
  const { order, attempts, accounts, blockedReason, feeLabel, todayIso, receiptHref } = props;

  if (order?.status === "CONFIRMED" || order?.status === "REFUNDED") {
    return (
      <section aria-labelledby="paid-heading" className="space-y-4 rounded-2xl bg-brand-deep p-6 text-white">
        <h2 id="paid-heading" className="font-display text-3xl font-semibold">
          {order.status === "CONFIRMED" ? "Your registration fee is confirmed" : "Your registration fee has been refunded"}
        </h2>
        <p className="text-white/85">
          Order {order.reference} · {order.amountLabel}. Your receipt is available for printing or saving.
        </p>
        {receiptHref ? (
          <Button variant="secondary" render={<Link href={receiptHref} />}>
            View receipt
          </Button>
        ) : null}
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {blockedReason ? <FormAlert tone="info" message={blockedReason} /> : null}

      {!order && !blockedReason && accounts.length > 0 ? (
        <section aria-labelledby="order-heading" className="space-y-5">
          <h2 id="order-heading" className="font-display text-2xl font-semibold">
            Your payment reference
          </h2>
          <p className="text-brand-muted">
            Your registration fee is {feeLabel}, paid once. Creating a reference locks in the receiving account for this
            payment.
          </p>
          <CreateOrderForm accounts={accounts} />
        </section>
      ) : null}

      {order && (order.status === "UNPAID" || order.status === "AWAITING_REVIEW") ? (
        <section aria-labelledby="instructions-heading" className="space-y-6 rounded-2xl border border-brand-border bg-brand-surface p-6">
          <div className="space-y-2">
            <h2 id="instructions-heading" className="font-display text-2xl font-semibold">
              Pay by transfer
            </h2>
            <p className="text-sm text-brand-muted">Quote this reference in the transfer narration so the reviewer can match it.</p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Amount</dt>
              <dd className="text-2xl font-semibold">{order.amountLabel}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Order reference</dt>
              <dd className="font-mono text-xl font-semibold tracking-wider">{order.reference}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Method</dt>
              <dd>{order.method ? PAYMENT_METHOD_LABELS[order.method] : "Not set"}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-brand-muted">Account title</dt>
              <dd>{order.accountTitle ?? "Not set"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-semibold text-brand-muted">Account number or wallet</dt>
              <dd className="font-mono text-lg">{order.accountIdentifier ?? "Not set"}</dd>
            </div>
          </dl>
          {order.instructions ? <p className="whitespace-pre-line text-sm leading-relaxed text-brand-muted">{order.instructions}</p> : null}
          {order.status === "AWAITING_REVIEW" ? (
            <FormAlert tone="info" message="Your transfer is awaiting review. You will be notified when a finance reviewer has checked it." />
          ) : (
            <PaymentEvidenceForm order={order} todayIso={todayIso} />
          )}
        </section>
      ) : null}

      {attempts.length > 0 ? (
        <section aria-labelledby="history-heading" className="space-y-4">
          <h2 id="history-heading" className="font-display text-2xl font-semibold">
            Submissions
          </h2>
          <ul className="divide-y divide-brand-border rounded-xl border border-brand-border bg-brand-surface">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="space-y-1 px-5 py-4">
                <p className="font-semibold">
                  {attempt.status === "SUBMITTED"
                    ? "Awaiting review"
                    : attempt.status === "CONFIRMED"
                      ? "Confirmed"
                      : "Needs correction"}
                </p>
                <p className="text-sm text-brand-muted">
                  Reference {attempt.transactionReference} · {attempt.dateLabel}
                </p>
                {attempt.reviewNote && attempt.status === "REJECTED" ? (
                  <p className="text-sm text-brand-danger">{attempt.reviewNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
