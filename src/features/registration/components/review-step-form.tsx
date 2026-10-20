"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ROUTES } from "@/constants/routes";

import { submitApplicationAction } from "../actions/onboarding.actions";
import { StepErrorSummary } from "./step-error-summary";

export interface ReviewSummaryRow {
  label: string;
  value: string;
}

interface ReviewStepFormProps {
  summary: readonly ReviewSummaryRow[];
  feeLabel: string;
  missingItems: readonly string[];
  emailVerified: boolean;
}

export function ReviewStepForm({ summary, feeLabel, missingItems, emailVerified }: ReviewStepFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [attendedUps, setAttendedUps] = useState(false);
  const [informationAccurate, setInformationAccurate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const canSubmit = emailVerified && missingItems.length === 0;

  const onSubmit = () => {
    setMessage(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await submitApplicationAction({ attendedUps, informationAccurate });
      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.push(ROUTES.appStatus);
      router.refresh();
    });
  };

  return (
    <div className="space-y-10">
      <StepErrorSummary message={message} fieldErrors={fieldErrors} />

      {!emailVerified ? (
        <FormAlert tone="error" message="Verify your email address before you can submit. Check your inbox for the link." />
      ) : null}

      {missingItems.length > 0 ? (
        <section aria-labelledby="missing-heading" className="space-y-3 rounded-xl border border-brand-violet/50 bg-brand-lavender/60 p-5">
          <h2 id="missing-heading" className="font-display text-2xl font-semibold">
            Still to complete
          </h2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {missingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="summary-heading" className="space-y-4">
        <h2 id="summary-heading" className="font-display text-2xl font-semibold">
          Your application
        </h2>
        <dl className="divide-y divide-brand-border rounded-xl border border-brand-border bg-brand-surface">
          {summary.map((row) => (
            <div key={row.label} className="grid gap-1 px-5 py-4 sm:grid-cols-[200px_1fr] sm:gap-4">
              <dt className="text-sm font-semibold text-brand-muted">{row.label}</dt>
              <dd className="whitespace-pre-line text-sm">{row.value || "Not given"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="fee-heading" className="space-y-3 rounded-xl bg-brand-deep p-6 text-white">
        <h2 id="fee-heading" className="font-display text-2xl font-semibold">
          Registration fee
        </h2>
        <p className="text-3xl font-semibold">{feeLabel}</p>
        <p className="text-sm text-white/85">
          A one-time payment. You will see the receiving-account details on the next screen after you submit. Payment
          confirmation and alumni review are separate checks.
        </p>
      </section>

      <fieldset className="space-y-4" disabled={!canSubmit || isPending}>
        <legend className="mb-3 font-display text-2xl font-semibold">Confirm before you submit</legend>
        <label className="flex items-start gap-3">
          <Checkbox id="attendedUps" checked={attendedUps} onCheckedChange={(checked) => setAttendedUps(checked === true)} className="mt-1" />
          <span className="text-sm leading-relaxed">I attended University Public School.</span>
        </label>
        <label className="flex items-start gap-3">
          <Checkbox
            id="informationAccurate"
            checked={informationAccurate}
            onCheckedChange={(checked) => setInformationAccurate(checked === true)}
            className="mt-1"
          />
          <span className="text-sm leading-relaxed">The information I have given is accurate, and I will keep it up to date.</span>
        </label>
        {fieldErrors.attendedUps ? <p className="text-sm font-medium text-brand-danger">{fieldErrors.attendedUps}</p> : null}
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-brand-border pt-6 sm:flex-row sm:justify-between">
        <Button variant="ghost" render={<a href={`${ROUTES.appOnboarding}/privacy`} />}>
          Back to visibility settings
        </Button>
        <Button size="lg" onClick={onSubmit} disabled={!canSubmit || !attendedUps || !informationAccurate || isPending}>
          {isPending ? "Submitting…" : "Submit application"}
        </Button>
      </div>
    </div>
  );
}
