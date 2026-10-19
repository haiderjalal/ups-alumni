"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/action";

import { createReportFormSchema, type ReportFormValues } from "../validation/report.schema";

interface ReportDisclosureProps {
  triggerLabel: string;
  triggerAccessibleLabel: string;
  reasons: readonly string[];
  onReport: (values: ReportFormValues) => Promise<ActionResult>;
}

const DETAILS_HINT = "Describe what happened. Reports are reviewed by the moderation team and are never shown to the member.";

/** Collapsed by default. Reason is required; details are optional. Focus moves to the reason field when it opens. */
export function ReportDisclosure({ triggerLabel, triggerAccessibleLabel, reasons, onReport }: ReportDisclosureProps) {
  const baseId = useId();
  const formId = `${baseId}-report`;
  const reasonId = `${baseId}-reason`;
  const detailsId = `${baseId}-details`;
  const [isOpen, setIsOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const reasonFieldRef = useRef<HTMLSelectElement | null>(null);

  const schema = useMemo(() => createReportFormSchema(reasons), [reasons]);
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "", details: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;
  const reasonRegistration = form.register("reason");

  useEffect(() => {
    if (isOpen) {
      reasonFieldRef.current?.focus();
    }
  }, [isOpen]);

  if (isSent) {
    return <FormAlert tone="success" message="Thank you. Your report has been sent for review." />;
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={false}
        aria-controls={formId}
        aria-label={triggerAccessibleLabel}
        onClick={() => setIsOpen(true)}
      >
        {triggerLabel}
      </Button>
    );
  }

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await onReport(values);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setIsSent(true);
    });
  });

  return (
    <form
      id={formId}
      onSubmit={submit}
      noValidate
      aria-label={triggerAccessibleLabel}
      className="w-full space-y-4 rounded-xl border border-brand-border bg-brand-surface p-4"
    >
      <FormAlert tone="error" message={formError} />

      <FormField id={reasonId} label="Reason" required error={errors.reason?.message}>
        <select
          id={reasonId}
          className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 text-base text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep md:text-sm"
          aria-invalid={Boolean(errors.reason)}
          aria-describedby={describedBy(reasonId, undefined, errors.reason?.message)}
          {...reasonRegistration}
          ref={(element) => {
            reasonRegistration.ref(element);
            reasonFieldRef.current = element;
          }}
        >
          <option value="">Choose a reason</option>
          {reasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id={detailsId} label="Details (optional)" hint={DETAILS_HINT} error={errors.details?.message}>
        <Textarea
          id={detailsId}
          rows={3}
          aria-invalid={Boolean(errors.details)}
          aria-describedby={describedBy(detailsId, DETAILS_HINT, errors.details?.message)}
          {...form.register("details")}
        />
      </FormField>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Sending…" : "Send report"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={isPending}
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
