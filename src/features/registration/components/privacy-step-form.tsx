"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ROUTES } from "@/constants/routes";

import { continueStepAction, saveStepDraftAction, updateProfileSectionAction } from "../actions/onboarding.actions";
import type { StepFormMode } from "./account-step-form";
import { autosaveMessage, useAutosave } from "./use-autosave";
import { StepErrorSummary } from "./step-error-summary";

type VisibilityValue = "PRIVATE" | "CONNECTIONS" | "MEMBERS";

export interface PrivacyStepDefaults {
  directoryDiscoverable: boolean;
  emailVisibility: VisibilityValue;
  phoneVisibility: VisibilityValue;
  linkedinVisibility: VisibilityValue;
  newsletterOptIn: boolean;
  eventEmails: boolean;
  connectionEmails: boolean;
}

const VISIBILITY_OPTIONS: { value: VisibilityValue; label: string }[] = [
  { value: "PRIVATE", label: "Only me and the network team" },
  { value: "CONNECTIONS", label: "My accepted connections" },
  { value: "MEMBERS", label: "All active members" },
];

function VisibilitySelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: VisibilityValue;
  onChange: (value: VisibilityValue) => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as VisibilityValue)}
        className="h-11 w-full rounded-lg border border-brand-border bg-brand-surface px-3 text-base focus-visible:outline-brand-deep"
      >
        {VISIBILITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand-border bg-brand-surface p-4">
      <Checkbox id={id} checked={checked} onCheckedChange={(next) => onChange(next === true)} className="mt-1" aria-describedby={`${id}-hint`} />
      <div className="space-y-1">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-sm text-brand-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

export function PrivacyStepForm({ defaults, nextHref, mode = "registration" }: { defaults: PrivacyStepDefaults; nextHref: string; mode?: StepFormMode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [values, setValues] = useState<PrivacyStepDefaults>(defaults);
  const update = <K extends keyof PrivacyStepDefaults>(key: K, value: PrivacyStepDefaults[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const autosave = useAutosave(values, (draft) => saveStepDraftAction("privacy", draft), mode === "registration");

  const onSubmit = () => {
    setMessage(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = mode === "profile" ? await updateProfileSectionAction("privacy", values) : await continueStepAction("privacy", values);
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
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
      className="space-y-8"
    >
      <StepErrorSummary message={message} fieldErrors={fieldErrors} />
      {mode === "registration" ? (
        <p role="status" aria-live="polite" className="text-sm text-brand-muted">
          {autosaveMessage(autosave)}
        </p>
      ) : null}
      {savedNotice ? <p role="status" className="text-sm font-semibold text-brand-success">{savedNotice}</p> : null}

      <section aria-labelledby="directory-heading" className="space-y-4">
        <h2 id="directory-heading" className="font-display text-2xl font-semibold">
          Directory
        </h2>
        <CheckboxRow
          id="directoryDiscoverable"
          label="Show my profile in the member directory"
          description="Off by default. When on, active members can find you by name, batch, city, industry and skills. Your contact details still follow the settings below."
          checked={values.directoryDiscoverable}
          onChange={(checked) => update("directoryDiscoverable", checked)}
        />
      </section>

      <section aria-labelledby="contact-heading" className="space-y-4">
        <h2 id="contact-heading" className="font-display text-2xl font-semibold">
          Who can see my contact details
        </h2>
        <p className="text-sm text-brand-muted">Your details are private until you choose otherwise.</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <VisibilitySelect id="emailVisibility" label="Email address" value={values.emailVisibility} onChange={(value) => update("emailVisibility", value)} />
          <VisibilitySelect id="phoneVisibility" label="Phone number" value={values.phoneVisibility} onChange={(value) => update("phoneVisibility", value)} />
          <VisibilitySelect id="linkedinVisibility" label="LinkedIn profile" value={values.linkedinVisibility} onChange={(value) => update("linkedinVisibility", value)} />
        </div>
      </section>

      <section aria-labelledby="comms-heading" className="space-y-4">
        <h2 id="comms-heading" className="font-display text-2xl font-semibold">
          Communication preferences
        </h2>
        <p className="text-sm text-brand-muted">
          Account and payment messages are always sent. The options below are optional.
        </p>
        <CheckboxRow
          id="newsletterOptIn"
          label="Send me the network newsletter"
          description="Optional. You can unsubscribe at any time from the link in each newsletter."
          checked={values.newsletterOptIn}
          onChange={(checked) => update("newsletterOptIn", checked)}
        />
        <CheckboxRow
          id="eventEmails"
          label="Email me about events"
          description="Reunions, networking sessions and school visits."
          checked={values.eventEmails}
          onChange={(checked) => update("eventEmails", checked)}
        />
        <CheckboxRow
          id="connectionEmails"
          label="Email me about connection requests and messages"
          description="Sent only when someone asks to connect with you or messages you."
          checked={values.connectionEmails}
          onChange={(checked) => update("connectionEmails", checked)}
        />
      </section>

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
