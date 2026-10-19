"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/action";

import { saveMentorProfileAction } from "../actions/mentorship.actions";
import { NO_SCHEDULING_NOTICE } from "../constants";
import type { OwnMentorProfile } from "../services/mentor-profile.service";
import {
  mentorProfileSchema,
  type MentorProfileFormInput,
} from "../validation/mentorship.schema";

interface MentorProfileFormProps {
  initial: OwnMentorProfile | null;
}

interface FormMessage {
  tone: "error" | "success";
  text: string;
}

function toFormValues(
  initial: OwnMentorProfile | null,
): MentorProfileFormInput {
  return {
    expertise: initial?.expertise ?? "",
    topics: initial?.topics.join(", ") ?? "",
    languages: initial?.languages.join(", ") ?? "",
    availability: initial?.availability ?? "",
    capacity: initial?.capacity ?? 1,
    isActive: initial?.isActive ?? false,
  };
}

export function MentorProfileForm({ initial }: MentorProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<FormMessage | null>(null);

  const form = useForm<MentorProfileFormInput>({
    resolver: zodResolver(mentorProfileSchema),
    defaultValues: toFormValues(initial),
    mode: "onTouched",
  });
  const { errors } = form.formState;
  const isActive = useWatch({ control: form.control, name: "isActive" });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result: ActionResult = await saveMentorProfileAction(values);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setMessage({ tone: "success", text: "Your mentor profile is saved." });
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-6"
      aria-busy={isPending}
    >
      <FormAlert
        tone={message?.tone ?? "info"}
        message={message?.text ?? null}
      />
      <p className="rounded-xl bg-brand-sage px-4 py-3 text-sm leading-relaxed text-brand-ink">
        {NO_SCHEDULING_NOTICE}
      </p>

      <FormField
        id="expertise"
        label="Your expertise"
        required
        error={errors.expertise?.message}
        hint="At least 10 characters. Up to 600."
      >
        <Textarea
          id="expertise"
          rows={4}
          aria-invalid={Boolean(errors.expertise)}
          aria-describedby={describedBy(
            "expertise",
            "hint",
            errors.expertise?.message,
          )}
          {...form.register("expertise")}
        />
      </FormField>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          id="topics"
          label="Topics"
          required
          error={errors.topics?.message}
          hint="Separate with commas, for example: career coaching, civil engineering."
        >
          <Input
            id="topics"
            aria-invalid={Boolean(errors.topics)}
            aria-describedby={describedBy(
              "topics",
              "hint",
              errors.topics?.message,
            )}
            {...form.register("topics")}
          />
        </FormField>

        <FormField
          id="languages"
          label="Languages"
          error={errors.languages?.message}
          hint="Optional. Separate with commas."
        >
          <Input
            id="languages"
            aria-invalid={Boolean(errors.languages)}
            aria-describedby={describedBy(
              "languages",
              "hint",
              errors.languages?.message,
            )}
            {...form.register("languages")}
          />
        </FormField>
      </div>

      <FormField
        id="availability"
        label="Availability"
        required
        error={errors.availability?.message}
        hint="For example: weekday evenings, Pakistan time."
      >
        <Input
          id="availability"
          aria-invalid={Boolean(errors.availability)}
          aria-describedby={describedBy(
            "availability",
            "hint",
            errors.availability?.message,
          )}
          {...form.register("availability")}
        />
      </FormField>

      <FormField
        id="capacity"
        label="Mentees you can take at once"
        required
        error={errors.capacity?.message}
        hint="A whole number from 1 to 10."
      >
        <Input
          id="capacity"
          type="number"
          inputMode="numeric"
          min={1}
          max={10}
          step={1}
          className="sm:max-w-32"
          aria-invalid={Boolean(errors.capacity)}
          aria-describedby={describedBy(
            "capacity",
            "hint",
            errors.capacity?.message,
          )}
          {...form.register("capacity", { valueAsNumber: true })}
        />
      </FormField>

      <div className="flex items-start gap-3">
        <Checkbox
          id="isActive"
          checked={isActive}
          onCheckedChange={(checked) =>
            form.setValue("isActive", checked === true, { shouldDirty: true })
          }
          aria-describedby="isActive-hint"
          className="mt-1"
        />
        <div className="space-y-1">
          <label htmlFor="isActive" className="font-semibold text-brand-ink">
            Accept mentorship requests
          </label>
          <p
            id="isActive-hint"
            className="text-sm leading-relaxed text-brand-muted"
          >
            When on, your profile appears in mentor search. Turn it off to stop
            new requests. Existing mentorships continue.
          </p>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        disabled={isPending}
      >
        {isPending ? "Saving…" : "Save mentor profile"}
      </Button>
    </form>
  );
}
