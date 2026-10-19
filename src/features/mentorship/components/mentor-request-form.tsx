"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/action";

import { sendMentorshipRequestAction } from "../actions/mentorship.actions";
import { NO_SCHEDULING_NOTICE, PREFERRED_FORMAT_LABELS } from "../constants";
import { PREFERRED_FORMATS } from "../domain/mentorship-rules";
import {
  mentorshipRequestSchema,
  type MentorshipRequestFormInput,
} from "../validation/mentorship.schema";

interface MentorRequestFormProps {
  mentorProfileId: string;
}

interface FormMessage {
  tone: "error" | "success";
  text: string;
}

const SELECT_CLASS =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

export function MentorRequestForm({ mentorProfileId }: MentorRequestFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<FormMessage | null>(null);

  const form = useForm<MentorshipRequestFormInput>({
    resolver: zodResolver(mentorshipRequestSchema),
    defaultValues: { mentorProfileId, goal: "", preferredFormat: "ONLINE" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result: ActionResult<{ requestId: string }> =
        await sendMentorshipRequestAction(values);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      form.reset({ mentorProfileId, goal: "", preferredFormat: "ONLINE" });
      setMessage({
        tone: "success",
        text: "Your request was sent. The mentor will accept or decline it.",
      });
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-5"
      aria-busy={isPending}
    >
      <FormAlert
        tone={message?.tone ?? "info"}
        message={message?.text ?? null}
      />
      <p className="text-sm leading-relaxed text-brand-muted">
        {NO_SCHEDULING_NOTICE}
      </p>

      <FormField
        id="goal"
        label="What would you like help with?"
        required
        error={errors.goal?.message}
        hint="Up to 800 characters."
      >
        <Textarea
          id="goal"
          rows={4}
          aria-invalid={Boolean(errors.goal)}
          aria-describedby={describedBy("goal", "hint", errors.goal?.message)}
          {...form.register("goal")}
        />
      </FormField>

      <FormField
        id="preferredFormat"
        label="Preferred format"
        required
        error={errors.preferredFormat?.message}
      >
        <select
          id="preferredFormat"
          className={SELECT_CLASS}
          aria-invalid={Boolean(errors.preferredFormat)}
          aria-describedby={describedBy(
            "preferredFormat",
            undefined,
            errors.preferredFormat?.message,
          )}
          {...form.register("preferredFormat")}
        >
          {PREFERRED_FORMATS.map((format) => (
            <option key={format} value={format}>
              {PREFERRED_FORMAT_LABELS[format]}
            </option>
          ))}
        </select>
      </FormField>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
