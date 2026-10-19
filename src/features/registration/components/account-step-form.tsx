"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";

import { continueStepAction, saveStepDraftAction, updateProfileSectionAction } from "../actions/onboarding.actions";
import { autosaveMessage, useAutosave } from "./use-autosave";
import { StepErrorSummary } from "./step-error-summary";

export interface AccountStepDefaults {
  fullName: string;
  phone: string;
  currentCity: string;
  currentCountry: string;
  hometown: string;
  pronouns: string;
  bio: string;
}

export type StepFormMode = "registration" | "profile";

export function AccountStepForm({ defaults, nextHref, mode = "registration" }: { defaults: AccountStepDefaults; nextHref: string; mode?: StepFormMode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const form = useForm<AccountStepDefaults>({ defaultValues: defaults });
  const { errors } = form.formState;
  const values = form.watch();
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const autosave = useAutosave(values, (draft) => saveStepDraftAction("account", draft), mode === "registration");

  const onSubmit = form.handleSubmit((data) => {
    setMessage(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = mode === "profile" ? await updateProfileSectionAction("account", data) : await continueStepAction("account", data);
      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      if (mode === "profile") {
        setSavedNotice("Your changes are saved.");
        router.refresh();
        return;
      }
      router.push(nextHref);
    });
  });

  const fieldError = (name: keyof AccountStepDefaults) => errors[name]?.message ?? fieldErrors[name];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <StepErrorSummary message={message} fieldErrors={fieldErrors} />
      {mode === "registration" ? (
        <p role="status" aria-live="polite" className="text-sm text-brand-muted">
          {autosaveMessage(autosave)}
        </p>
      ) : null}
      {savedNotice ? <p role="status" className="text-sm font-semibold text-brand-success">{savedNotice}</p> : null}

      <FormField id="fullName" label="Full name" required error={fieldError("fullName")}>
        <Input id="fullName" autoComplete="name" aria-invalid={Boolean(fieldError("fullName"))} aria-describedby={describedBy("fullName", undefined, fieldError("fullName"))} {...form.register("fullName", { required: true })} />
      </FormField>

      <FormField id="phone" label="Phone or WhatsApp number" hint="Optional. Pakistani numbers can start with 03. Overseas numbers need the country code, for example +44." error={fieldError("phone")}>
        <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(fieldError("phone"))} aria-describedby={describedBy("phone", "hint", fieldError("phone"))} {...form.register("phone")} />
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="currentCity" label="Current city" required error={fieldError("currentCity")}>
          <Input id="currentCity" autoComplete="address-level2" aria-invalid={Boolean(fieldError("currentCity"))} aria-describedby={describedBy("currentCity", undefined, fieldError("currentCity"))} {...form.register("currentCity")} />
        </FormField>
        <FormField id="currentCountry" label="Current country" required error={fieldError("currentCountry")}>
          <Input id="currentCountry" autoComplete="country-name" aria-invalid={Boolean(fieldError("currentCountry"))} aria-describedby={describedBy("currentCountry", undefined, fieldError("currentCountry"))} {...form.register("currentCountry")} />
        </FormField>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="hometown" label="Hometown" hint="Optional." error={fieldError("hometown")}>
          <Input id="hometown" aria-describedby={describedBy("hometown", "hint", fieldError("hometown"))} {...form.register("hometown")} />
        </FormField>
        <FormField id="pronouns" label="Pronouns" hint="Optional." error={fieldError("pronouns")}>
          <Input id="pronouns" aria-describedby={describedBy("pronouns", "hint", fieldError("pronouns"))} {...form.register("pronouns")} />
        </FormField>
      </div>

      <FormField id="bio" label="Short bio" hint="Optional. Up to 600 characters. Shown only to members you allow." error={fieldError("bio")}>
        <Textarea id="bio" rows={4} aria-describedby={describedBy("bio", "hint", fieldError("bio"))} {...form.register("bio")} />
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
