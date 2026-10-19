"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ActionResult } from "@/types/action";

import { submitBusinessForReviewAction } from "../actions/business.actions";

interface BusinessSubmitFormProps {
  businessId: string;
  isPublished: boolean;
  publishContact: boolean;
}

interface FormMessage {
  tone: "error" | "success";
  text: string;
}

export function BusinessSubmitForm({
  businessId,
  isPublished,
  publishContact,
}: BusinessSubmitFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [publish, setPublish] = useState(publishContact);
  const [message, setMessage] = useState<FormMessage | null>(null);

  const unchanged = isPublished && publish === publishContact;
  const submitLabel = isPublished
    ? "Update contact visibility"
    : "Submit for review";

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result: ActionResult = await submitBusinessForReviewAction({
        businessId,
        publishContact: publish,
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setMessage({
        tone: "success",
        text: "Submitted. Staff will review the listing before it appears in the directory.",
      });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" aria-busy={isPending}>
      <FormAlert
        tone={message?.tone ?? "info"}
        message={message?.text ?? null}
      />

      <div className="flex items-start gap-3">
        <Checkbox
          id="publishContact"
          checked={publish}
          onCheckedChange={(checked) => setPublish(checked === true)}
          aria-describedby="publishContact-hint"
          className="mt-1"
        />
        <div className="space-y-1">
          <label
            htmlFor="publishContact"
            className="font-semibold text-brand-ink"
          >
            Publish business contact details
          </label>
          <p
            id="publishContact-hint"
            className="text-sm leading-relaxed text-brand-muted"
          >
            When staff approve the listing, the business email and phone number
            appear on its public page. Leave this unchecked to keep them
            private. Your personal profile settings do not control this.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isPending || unchanged}>
        {isPending ? "Submitting…" : submitLabel}
      </Button>
    </form>
  );
}
