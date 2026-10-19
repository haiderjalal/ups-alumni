"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";

import { continueStepAction, saveStepDraftAction, updateProfileSectionAction } from "../actions/onboarding.actions";
import type { StepFormMode } from "./account-step-form";
import { autosaveMessage, useAutosave } from "./use-autosave";
import { StepErrorSummary } from "./step-error-summary";

const STATUS_OPTIONS = [
  { value: "EMPLOYED", label: "Employed" },
  { value: "BUSINESS_OWNER", label: "Business owner" },
  { value: "SELF_EMPLOYED_FREELANCER", label: "Self-employed or freelancer" },
  { value: "STUDENT", label: "Student" },
  { value: "SEEKING_OPPORTUNITIES", label: "Seeking opportunities" },
  { value: "RETIRED", label: "Retired" },
  { value: "OTHER", label: "Other" },
] as const;

const MAX_EDUCATION_ENTRIES = 5;

interface EducationValues {
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
}

export interface ProfileStepDefaults {
  professionalStatuses: string[];
  jobTitle: string;
  organization: string;
  industry: string;
  companyUrl: string;
  businessName: string;
  businessSector: string;
  businessCity: string;
  businessDescription: string;
  businessProductsServices: string;
  businessWebsite: string;
  expertise: string;
  offeredServices: string;
  portfolioUrl: string;
  institution: string;
  fieldOfStudy: string;
  expectedCompletionYear: string;
  desiredRoles: string;
  skills: string;
  interests: string;
  linkedinUrl: string;
  education: EducationValues[];
  availableToMentor: boolean;
  seekingMentorship: boolean;
  hiring: boolean;
  openToCollaboration: boolean;
  volunteering: boolean;
}

/** Commas or new lines separate list answers. Empty items are dropped before the server sees them. */
function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toSubmission(values: ProfileStepDefaults): Record<string, unknown> {
  return {
    ...values,
    desiredRoles: splitList(values.desiredRoles),
    skills: splitList(values.skills),
    interests: splitList(values.interests),
    education: values.education.filter((entry) => entry.institution.trim() || entry.qualification.trim()),
  };
}

export function ProfileStepForm({ defaults, nextHref, mode = "registration" }: { defaults: ProfileStepDefaults; nextHref: string; mode?: StepFormMode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const form = useForm<ProfileStepDefaults>({ defaultValues: defaults });
  const { errors } = form.formState;
  const education = useFieldArray({ control: form.control, name: "education" });
  const values = form.watch();
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const autosave = useAutosave(values, (draft) => saveStepDraftAction("profile", draft), mode === "registration");

  const selectedStatuses = new Set(values.professionalStatuses);
  const isEmployed = selectedStatuses.has("EMPLOYED");
  const isStudent = selectedStatuses.has("STUDENT");
  const isFreelancer = selectedStatuses.has("SELF_EMPLOYED_FREELANCER");
  const isSeeking = selectedStatuses.has("SEEKING_OPPORTUNITIES");
  const isBusinessOwner = selectedStatuses.has("BUSINESS_OWNER");

  const fieldError = (name: keyof ProfileStepDefaults) => {
    const formError = errors[name];
    const formMessage = formError && "message" in formError ? formError.message : undefined;
    return formMessage ?? fieldErrors[name];
  };

  const onSubmit = form.handleSubmit((data) => {
    setMessage(null);
    setFieldErrors({});
    startTransition(async () => {
      const payload = toSubmission(data);
      const result = mode === "profile" ? await updateProfileSectionAction("occupation", payload) : await continueStepAction("profile", payload);
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

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <StepErrorSummary message={message} fieldErrors={fieldErrors} />
      {mode === "registration" ? (
        <p role="status" aria-live="polite" className="text-sm text-brand-muted">
          {autosaveMessage(autosave)}
        </p>
      ) : null}
      {savedNotice ? <p role="status" className="text-sm font-semibold text-brand-success">{savedNotice}</p> : null}

      <fieldset className="space-y-4" aria-describedby={describedBy("professionalStatuses", undefined, fieldError("professionalStatuses"))}>
        <legend className="mb-3 text-sm font-semibold">Current status (choose all that apply)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
              <input type="checkbox" value={option.value} className="size-4 accent-brand-deep" {...form.register("professionalStatuses")} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {fieldError("professionalStatuses") ? (
          <p id="professionalStatuses-error" role="alert" className="text-sm font-medium text-brand-danger">
            {fieldError("professionalStatuses")}
          </p>
        ) : null}
      </fieldset>

      {isEmployed ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id="jobTitle" label="Job title" required error={fieldError("jobTitle")}>
            <Input id="jobTitle" aria-invalid={Boolean(fieldError("jobTitle"))} aria-describedby={describedBy("jobTitle", undefined, fieldError("jobTitle"))} {...form.register("jobTitle")} />
          </FormField>
          <FormField id="organization" label="Organization" required error={fieldError("organization")}>
            <Input id="organization" aria-invalid={Boolean(fieldError("organization"))} aria-describedby={describedBy("organization", undefined, fieldError("organization"))} {...form.register("organization")} />
          </FormField>
          <FormField id="industry" label="Industry" hint="Optional." error={fieldError("industry")}>
            <Input id="industry" {...form.register("industry")} />
          </FormField>
          <FormField id="companyUrl" label="Company website" hint="Optional. Must start with https:// or http://." error={fieldError("companyUrl")}>
            <Input id="companyUrl" type="url" inputMode="url" aria-describedby={describedBy("companyUrl", "hint", fieldError("companyUrl"))} {...form.register("companyUrl")} />
          </FormField>
        </div>
      ) : null}

      {isStudent ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id="institution" label="Institution" required error={fieldError("institution")}>
            <Input id="institution" aria-invalid={Boolean(fieldError("institution"))} aria-describedby={describedBy("institution", undefined, fieldError("institution"))} {...form.register("institution")} />
          </FormField>
          <FormField id="fieldOfStudy" label="Course or field" required error={fieldError("fieldOfStudy")}>
            <Input id="fieldOfStudy" aria-invalid={Boolean(fieldError("fieldOfStudy"))} aria-describedby={describedBy("fieldOfStudy", undefined, fieldError("fieldOfStudy"))} {...form.register("fieldOfStudy")} />
          </FormField>
          <FormField id="expectedCompletionYear" label="Expected completion year" hint="Optional." error={fieldError("expectedCompletionYear")}>
            <Input id="expectedCompletionYear" inputMode="numeric" aria-describedby={describedBy("expectedCompletionYear", "hint", fieldError("expectedCompletionYear"))} {...form.register("expectedCompletionYear")} />
          </FormField>
        </div>
      ) : null}

      {isFreelancer ? (
        <div className="grid gap-6">
          <FormField id="expertise" label="Your expertise" required error={fieldError("expertise")}>
            <Textarea id="expertise" rows={3} aria-invalid={Boolean(fieldError("expertise"))} aria-describedby={describedBy("expertise", undefined, fieldError("expertise"))} {...form.register("expertise")} />
          </FormField>
          <FormField id="offeredServices" label="Services you offer" hint="Optional." error={fieldError("offeredServices")}>
            <Textarea id="offeredServices" rows={2} {...form.register("offeredServices")} />
          </FormField>
          <FormField id="portfolioUrl" label="Portfolio link" hint="Optional." error={fieldError("portfolioUrl")}>
            <Input id="portfolioUrl" type="url" inputMode="url" {...form.register("portfolioUrl")} />
          </FormField>
        </div>
      ) : null}

      {isSeeking ? (
        <FormField id="desiredRoles" label="Roles you are looking for" required hint="Separate with commas." error={fieldError("desiredRoles")}>
          <Input id="desiredRoles" aria-invalid={Boolean(fieldError("desiredRoles"))} aria-describedby={describedBy("desiredRoles", "hint", fieldError("desiredRoles"))} {...form.register("desiredRoles")} />
        </FormField>
      ) : null}

      {isBusinessOwner ? (
        <section aria-labelledby="business-heading" className="space-y-6 rounded-xl border border-brand-border bg-brand-surface p-5">
          <div className="space-y-2">
            <h2 id="business-heading" className="font-display text-2xl font-semibold">Your business</h2>
            <p className="text-sm text-brand-muted">
              Your business is saved as a draft. It is listed in the business directory only after staff review and your
              explicit opt-in on the business page.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField id="businessName" label="Business name" required error={fieldError("businessName")}>
              <Input id="businessName" aria-invalid={Boolean(fieldError("businessName"))} aria-describedby={describedBy("businessName", undefined, fieldError("businessName"))} {...form.register("businessName")} />
            </FormField>
            <FormField id="businessSector" label="Sector" required error={fieldError("businessSector")}>
              <Input id="businessSector" aria-invalid={Boolean(fieldError("businessSector"))} aria-describedby={describedBy("businessSector", undefined, fieldError("businessSector"))} {...form.register("businessSector")} />
            </FormField>
            <FormField id="businessCity" label="City" required error={fieldError("businessCity")}>
              <Input id="businessCity" aria-invalid={Boolean(fieldError("businessCity"))} aria-describedby={describedBy("businessCity", undefined, fieldError("businessCity"))} {...form.register("businessCity")} />
            </FormField>
            <FormField id="businessWebsite" label="Website" hint="Optional." error={fieldError("businessWebsite")}>
              <Input id="businessWebsite" type="url" inputMode="url" {...form.register("businessWebsite")} />
            </FormField>
          </div>
          <FormField id="businessDescription" label="What the business does" required error={fieldError("businessDescription")}>
            <Textarea id="businessDescription" rows={3} aria-invalid={Boolean(fieldError("businessDescription"))} aria-describedby={describedBy("businessDescription", undefined, fieldError("businessDescription"))} {...form.register("businessDescription")} />
          </FormField>
          <FormField id="businessProductsServices" label="Main products or services" required error={fieldError("businessProductsServices")}>
            <Textarea id="businessProductsServices" rows={2} aria-invalid={Boolean(fieldError("businessProductsServices"))} aria-describedby={describedBy("businessProductsServices", undefined, fieldError("businessProductsServices"))} {...form.register("businessProductsServices")} />
          </FormField>
        </section>
      ) : null}

      <section aria-labelledby="extras-heading" className="space-y-6">
        <h2 id="extras-heading" className="font-display text-2xl font-semibold">Skills, interests and education</h2>
        <FormField id="skills" label="Skills" hint="Optional. Separate with commas." error={fieldError("skills")}>
          <Input id="skills" {...form.register("skills")} />
        </FormField>
        <FormField id="interests" label="Interests" hint="Optional. Separate with commas." error={fieldError("interests")}>
          <Input id="interests" {...form.register("interests")} />
        </FormField>
        <FormField id="linkedinUrl" label="LinkedIn profile" hint="Optional. Visibility is set in the next step." error={fieldError("linkedinUrl")}>
          <Input id="linkedinUrl" type="url" inputMode="url" {...form.register("linkedinUrl")} />
        </FormField>

        <div className="space-y-4">
          {education.fields.map((field, index) => (
            <fieldset key={field.id} className="space-y-4 rounded-xl border border-brand-border bg-brand-surface p-5">
              <legend className="px-1 text-sm font-semibold">Education entry {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id={`education-${index}-institution`} label="Institution">
                  <Input id={`education-${index}-institution`} {...form.register(`education.${index}.institution`)} />
                </FormField>
                <FormField id={`education-${index}-qualification`} label="Qualification">
                  <Input id={`education-${index}-qualification`} {...form.register(`education.${index}.qualification`)} />
                </FormField>
                <FormField id={`education-${index}-field`} label="Field of study" hint="Optional.">
                  <Input id={`education-${index}-field`} {...form.register(`education.${index}.fieldOfStudy`)} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField id={`education-${index}-start`} label="Start year" hint="Optional.">
                    <Input id={`education-${index}-start`} inputMode="numeric" {...form.register(`education.${index}.startYear`)} />
                  </FormField>
                  <FormField id={`education-${index}-end`} label="End year" hint="Optional.">
                    <Input id={`education-${index}-end`} inputMode="numeric" {...form.register(`education.${index}.endYear`)} />
                  </FormField>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => education.remove(index)}>
                Remove this entry
              </Button>
            </fieldset>
          ))}
          {education.fields.length < MAX_EDUCATION_ENTRIES ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                education.append({ institution: "", qualification: "", fieldOfStudy: "", startYear: "", endYear: "" })
              }
            >
              Add an education entry
            </Button>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="mentoring-heading" className="space-y-4">
        <h2 id="mentoring-heading" className="font-display text-2xl font-semibold">How you would like to take part</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["availableToMentor", "I can mentor other alumni"],
              ["seekingMentorship", "I am looking for a mentor"],
              ["hiring", "My organization is hiring"],
              ["openToCollaboration", "Open to collaboration"],
              ["volunteering", "Interested in volunteering"],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
              <Checkbox
                id={name}
                checked={values[name]}
                onCheckedChange={(checked) => form.setValue(name, checked === true, { shouldDirty: true })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
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
