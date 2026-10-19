"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";

import { continueStepAction, saveStepDraftAction } from "../actions/onboarding.actions";
import { autosaveMessage, useAutosave } from "./use-autosave";
import { StepErrorSummary } from "./step-error-summary";

export const UNLISTED_BATCH = "unlisted";

export interface SchoolStepDefaults {
  batchChoice: string;
  matricYear: string;
  batchReviewNote: string;
  schoolJoinYear: string;
  schoolLeaveYear: string;
  section: string;
  house: string;
  rollNumber: string;
  schoolMemory: string;
}

interface SchoolStepFormProps {
  defaults: SchoolStepDefaults;
  listedYears: readonly number[];
  nextHref: string;
}

/** Converts the batch dropdown into the server's shape: a matric year plus a flag for manual review. */
function toSubmission(values: SchoolStepDefaults): Record<string, unknown> {
  const notListed = values.batchChoice === UNLISTED_BATCH;
  return {
    matricYear: notListed ? values.matricYear : values.batchChoice,
    batchNotListed: notListed,
    batchReviewNote: values.batchReviewNote,
    schoolJoinYear: values.schoolJoinYear,
    schoolLeaveYear: values.schoolLeaveYear,
    section: values.section,
    house: values.house,
    rollNumber: values.rollNumber,
    schoolMemory: values.schoolMemory,
  };
}

export function SchoolStepForm({ defaults, listedYears, nextHref }: SchoolStepFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const form = useForm<SchoolStepDefaults>({ defaultValues: defaults });
  const { errors } = form.formState;
  const values = form.watch();
  const autosave = useAutosave(values, (draft) => saveStepDraftAction("school", draft));
  const notListed = values.batchChoice === UNLISTED_BATCH;

  const fieldError = (name: keyof SchoolStepDefaults | "batchNotListed") =>
    (name in errors ? errors[name as keyof SchoolStepDefaults]?.message : undefined) ?? fieldErrors[name];

  const onSubmit = form.handleSubmit((data) => {
    setMessage(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await continueStepAction("school", toSubmission(data));
      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.push(nextHref);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <StepErrorSummary message={message} fieldErrors={fieldErrors} />
      <p role="status" aria-live="polite" className="text-sm text-brand-muted">
        {autosaveMessage(autosave)}
      </p>

      <FormField
        id="batchChoice"
        label="Matric completion year (batch)"
        required
        hint="For example, 2018 means the year you completed Class 10. Choose My batch is not listed if your year is missing."
        error={fieldError("matricYear")}
      >
        <select
          id="batchChoice"
          aria-invalid={Boolean(fieldError("matricYear"))}
          aria-describedby={describedBy("batchChoice", "hint", fieldError("matricYear"))}
          className="h-11 w-full rounded-lg border border-brand-border bg-brand-surface px-3 text-base focus-visible:outline-brand-deep"
          {...form.register("batchChoice")}
        >
          <option value="">Choose your batch</option>
          {listedYears.map((year) => (
            <option key={year} value={String(year)}>
              Batch {year}
            </option>
          ))}
          <option value={UNLISTED_BATCH}>My batch is not listed</option>
        </select>
      </FormField>

      {notListed ? (
        <div className="space-y-6 rounded-xl border border-brand-gold/40 bg-brand-tint/60 p-5">
          <p className="text-sm leading-relaxed">
            A reviewer will check your batch manually. Enter the year you completed Class 10 and explain briefly how we
            can confirm it.
          </p>
          <FormField id="matricYear" label="Matric completion year" required error={fieldError("matricYear")}>
            <Input
              id="matricYear"
              inputMode="numeric"
              placeholder="2018"
              aria-invalid={Boolean(fieldError("matricYear"))}
              aria-describedby={describedBy("matricYear", undefined, fieldError("matricYear"))}
              {...form.register("matricYear")}
            />
          </FormField>
          <FormField id="batchReviewNote" label="How can a reviewer confirm your batch?" required error={fieldError("batchReviewNote")} hint="For example, a classmate who is already a member, or a school document you can share later.">
            <Textarea id="batchReviewNote" rows={3} aria-invalid={Boolean(fieldError("batchReviewNote"))} aria-describedby={describedBy("batchReviewNote", "hint", fieldError("batchReviewNote"))} {...form.register("batchReviewNote")} />
          </FormField>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="schoolJoinYear" label="Year you joined the school" hint="Optional." error={fieldError("schoolJoinYear")}>
          <Input id="schoolJoinYear" inputMode="numeric" aria-describedby={describedBy("schoolJoinYear", "hint", fieldError("schoolJoinYear"))} {...form.register("schoolJoinYear")} />
        </FormField>
        <FormField id="schoolLeaveYear" label="Year you left the school" hint="Optional." error={fieldError("schoolLeaveYear")}>
          <Input id="schoolLeaveYear" inputMode="numeric" aria-describedby={describedBy("schoolLeaveYear", "hint", fieldError("schoolLeaveYear"))} {...form.register("schoolLeaveYear")} />
        </FormField>
        <FormField id="section" label="Section" hint="Optional, if the school used sections." error={fieldError("section")}>
          <Input id="section" {...form.register("section")} />
        </FormField>
        <FormField id="house" label="House" hint="Optional, if the school used houses." error={fieldError("house")}>
          <Input id="house" {...form.register("house")} />
        </FormField>
      </div>

      <FormField id="rollNumber" label="School roll number" hint="Optional. Visible only to you and network administrators." error={fieldError("rollNumber")}>
        <Input id="rollNumber" aria-describedby={describedBy("rollNumber", "hint", fieldError("rollNumber"))} {...form.register("rollNumber")} />
      </FormField>

      <FormField id="schoolMemory" label="A school memory" hint="Optional. Helps reviewers recognise you. It is never treated as proof of identity." error={fieldError("schoolMemory")}>
        <Textarea id="schoolMemory" rows={3} aria-describedby={describedBy("schoolMemory", "hint", fieldError("schoolMemory"))} {...form.register("schoolMemory")} />
      </FormField>

      <div className="flex flex-col-reverse gap-3 border-t border-brand-border pt-6 sm:flex-row sm:justify-between">
        <Button variant="ghost" render={<a href={ROUTES.appStatus} />}>
          Save and finish later
        </Button>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Saving…" : "Save and continue"}
        </Button>
      </div>
    </form>
  );
}
