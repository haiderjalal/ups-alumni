"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/action";
import { cn } from "@/lib/utils";

import { countCharacters, MESSAGE_BODY_MAX_LENGTH } from "../domain/message-rules";
import { messageComposerSchema, type MessageComposerValues } from "../validation/message.schema";

/** Shows the remaining count only when the viewer is close to the limit. */
const COUNTER_THRESHOLD = 1800;
const SEND_HINT = "Press Control or Command with Enter to send.";

interface MessageComposerProps {
  onSend: (body: string) => Promise<ActionResult>;
}

/** The draft is kept when a send fails, so nothing the member typed is lost. */
export function MessageComposer({ onSend }: MessageComposerProps) {
  const baseId = useId();
  const bodyId = `${baseId}-body`;
  const [isPending, startTransition] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);

  const form = useForm<MessageComposerValues>({
    resolver: zodResolver(messageComposerSchema),
    defaultValues: { body: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { errors } = form.formState;
  const used = countCharacters(form.watch("body"));
  const remaining = MESSAGE_BODY_MAX_LENGTH - used;

  const submit = form.handleSubmit((values) => {
    setSendError(null);
    startTransition(async () => {
      const result = await onSend(values.body);
      if (!result.ok) {
        setSendError(result.message);
        return;
      }
      form.reset({ body: "" });
    });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <FormAlert tone="error" message={sendError} />
      <FormField id={bodyId} label="Message" error={errors.body?.message} hint={SEND_HINT}>
        <Textarea
          id={bodyId}
          rows={3}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={describedBy(bodyId, SEND_HINT, errors.body?.message)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void submit();
            }
          }}
          {...form.register("body")}
        />
      </FormField>
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className={cn("text-xs", remaining <= MESSAGE_BODY_MAX_LENGTH - COUNTER_THRESHOLD ? "text-brand-danger" : "text-brand-muted")}>
          {used >= COUNTER_THRESHOLD ? `${remaining} characters left` : ""}
        </p>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Sending…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
