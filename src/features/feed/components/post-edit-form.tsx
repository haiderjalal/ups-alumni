"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { describedBy, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { editPostAction } from "../actions/feed.actions";
import { POST_BODY_MAX_LENGTH } from "../domain/feed-content-rules";

interface PostEditFormProps {
  postId: string;
  initialBody: string;
  onDone: () => void;
}

export function PostEditForm({ postId, initialBody, onDone }: PostEditFormProps) {
  const router = useRouter();
  const fieldId = useId();
  const [body, setBody] = useState(initialBody);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFieldError(null);
    setFormError(null);
    startTransition(async () => {
      const result = await editPostAction({ postId, body });
      if (!result.ok) {
        if (result.fieldErrors?.body) {
          setFieldError(result.fieldErrors.body);
        } else {
          setFormError(result.message);
        }
        return;
      }
      onDone();
      router.refresh();
    });
  }

  const hint = `Up to ${POST_BODY_MAX_LENGTH} characters.`;
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <FormField id={fieldId} label="Edit post" hint={hint} error={fieldError ?? undefined}>
        <Textarea
          id={fieldId}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, fieldError ?? undefined)}
          className="bg-white"
        />
      </FormField>
      <FormAlert tone="error" message={formError} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isPending || body.trim().length === 0}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
