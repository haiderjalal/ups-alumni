"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormAlert } from "@/components/shared/form-alert";
import { FormField, describedBy } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CONNECTION_NOTE_MAX_LENGTH } from "../domain/connection-rules";
import { connectionNoteFormSchema, type ConnectionNoteFormValues } from "../validation/connection.schema";

import { sendConnectionRequestAction } from "../actions/connection.actions";

interface ConnectRequestFormProps {
  memberId: string;
  memberName: string;
}

const NOTE_HINT = `Optional, up to ${CONNECTION_NOTE_MAX_LENGTH} characters. The member will see it with your request.`;

/** Opens a short form with an optional note. Sending is never automatic, so the viewer always chooses to connect. */
export function ConnectRequestForm({ memberId, memberName }: ConnectRequestFormProps) {
  const baseId = useId();
  const noteId = `${baseId}-note`;
  const formId = `${baseId}-connect`;
  const [isOpen, setIsOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ConnectionNoteFormValues>({
    resolver: zodResolver(connectionNoteFormSchema),
    defaultValues: { note: "" },
    mode: "onTouched",
  });
  const { errors } = form.formState;

  if (isSent) {
    return <FormAlert tone="success" message={`Request sent to ${memberName}.`} />;
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        size="lg"
        aria-expanded={false}
        aria-controls={formId}
        aria-label={`Send a connection request to ${memberName}`}
        onClick={() => setIsOpen(true)}
      >
        Connect
      </Button>
    );
  }

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await sendConnectionRequestAction({ memberId, note: values.note });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setIsSent(true);
    });
  });

  return (
    <form
      id={formId}
      onSubmit={submit}
      noValidate
      aria-label={`Connection request to ${memberName}`}
      className="w-full space-y-4 rounded-xl border border-brand-border bg-brand-surface p-4"
    >
      <FormAlert tone="error" message={formError} />
      <FormField id={noteId} label="Note (optional)" hint={NOTE_HINT} error={errors.note?.message}>
        <Textarea
          id={noteId}
          rows={3}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={describedBy(noteId, NOTE_HINT, errors.note?.message)}
          {...form.register("note")}
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Sending…" : "Send request"}
        </Button>
        <Button type="button" size="lg" variant="ghost" disabled={isPending} onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
