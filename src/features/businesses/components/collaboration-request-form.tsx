"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/action";

import { sendCollaborationRequestAction } from "../actions/business.actions";
import {
  collaborationRequestSchema,
  type CollaborationRequestInput,
} from "../validation/business.schema";

interface CollaborationRequestFormProps {
  businessId: string;
}

interface FormMessage {
  tone: "error" | "success";
  text: string;
}

export function CollaborationRequestForm({
  businessId,
}: CollaborationRequestFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<FormMessage | null>(null);

  const form = useForm<CollaborationRequestInput>({
    resolver: zodResolver(collaborationRequestSchema),
    defaultValues: { businessId, message: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result: ActionResult<{ requestId: string }> =
        await sendCollaborationRequestAction(values);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      form.reset({ businessId, message: "" });
      setMessage({
        tone: "success",
        text: "Your message was sent to the business owners.",
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

      <FormField
        id="collaboration-message"
        label="Your message"
        required
        error={errors.message?.message}
        hint="Introduce yourself and what you would like to discuss. You can send one message every 7 days."
      >
        <Textarea
          id="collaboration-message"
          rows={4}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy(
            "collaboration-message",
            "hint",
            errors.message?.message,
          )}
          {...form.register("message")}
        />
      </FormField>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
