"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/action";

import {
  OPPORTUNITY_CATEGORY_LABELS,
  REMOTE_TYPE_LABELS,
  OPPORTUNITY_CATEGORIES,
  REMOTE_TYPES,
} from "../constants";
import { submitOpportunityAction } from "../actions/opportunity.actions";
import {
  submitOpportunitySchema,
  type SubmitOpportunityInput,
} from "../validation/opportunity.schema";

interface FormMessage {
  tone: "error" | "success";
  text: string;
}

const SELECT_CLASS =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

const EMPTY_VALUES: SubmitOpportunityInput = {
  title: "",
  organization: "",
  category: "JOB",
  remoteType: "ONSITE",
  locationCity: "",
  description: "",
  applicationUrl: "",
  deadline: "",
};

export function OpportunitySubmitForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<FormMessage | null>(null);

  const form = useForm<SubmitOpportunityInput>({
    resolver: zodResolver(submitOpportunitySchema),
    defaultValues: EMPTY_VALUES,
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result: ActionResult<{ opportunityId: string }> =
        await submitOpportunityAction(values);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      form.reset(EMPTY_VALUES);
      setMessage({
        tone: "success",
        text: "Thanks. Staff will review your opportunity before it is listed.",
      });
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

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          id="title"
          label="Title"
          required
          error={errors.title?.message}
        >
          <Input
            id="title"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={describedBy(
              "title",
              undefined,
              errors.title?.message,
            )}
            {...form.register("title")}
          />
        </FormField>

        <FormField
          id="organization"
          label="Organization"
          required
          error={errors.organization?.message}
        >
          <Input
            id="organization"
            aria-invalid={Boolean(errors.organization)}
            aria-describedby={describedBy(
              "organization",
              undefined,
              errors.organization?.message,
            )}
            {...form.register("organization")}
          />
        </FormField>

        <FormField
          id="category"
          label="Category"
          required
          error={errors.category?.message}
        >
          <select
            id="category"
            className={SELECT_CLASS}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={describedBy(
              "category",
              undefined,
              errors.category?.message,
            )}
            {...form.register("category")}
          >
            {OPPORTUNITY_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {OPPORTUNITY_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          id="remoteType"
          label="Work arrangement"
          required
          error={errors.remoteType?.message}
        >
          <select
            id="remoteType"
            className={SELECT_CLASS}
            aria-invalid={Boolean(errors.remoteType)}
            aria-describedby={describedBy(
              "remoteType",
              undefined,
              errors.remoteType?.message,
            )}
            {...form.register("remoteType")}
          >
            {REMOTE_TYPES.map((value) => (
              <option key={value} value={value}>
                {REMOTE_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          id="locationCity"
          label="City"
          error={errors.locationCity?.message}
          hint="Required for on-site and hybrid roles."
        >
          <Input
            id="locationCity"
            autoComplete="address-level2"
            aria-invalid={Boolean(errors.locationCity)}
            aria-describedby={describedBy(
              "locationCity",
              "hint",
              errors.locationCity?.message,
            )}
            {...form.register("locationCity")}
          />
        </FormField>

        <FormField
          id="deadline"
          label="Application deadline"
          error={errors.deadline?.message}
          hint="Optional. Applications close at the end of this day (Pakistan time)."
        >
          <Input
            id="deadline"
            type="date"
            aria-invalid={Boolean(errors.deadline)}
            aria-describedby={describedBy(
              "deadline",
              "hint",
              errors.deadline?.message,
            )}
            {...form.register("deadline")}
          />
        </FormField>
      </div>

      <FormField
        id="applicationUrl"
        label="Application link"
        required
        error={errors.applicationUrl?.message}
        hint="Must start with https://. Members apply on the organization's own page."
      >
        <Input
          id="applicationUrl"
          type="url"
          inputMode="url"
          aria-invalid={Boolean(errors.applicationUrl)}
          aria-describedby={describedBy(
            "applicationUrl",
            "hint",
            errors.applicationUrl?.message,
          )}
          {...form.register("applicationUrl")}
        />
      </FormField>

      <FormField
        id="description"
        label="Description"
        required
        error={errors.description?.message}
        hint="Up to 3000 characters."
      >
        <Textarea
          id="description"
          rows={6}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy(
            "description",
            "hint",
            errors.description?.message,
          )}
          {...form.register("description")}
        />
      </FormField>

      <Button
        type="submit"
        size="lg"
        className="w-full sm:w-auto"
        disabled={isPending}
      >
        {isPending ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}
