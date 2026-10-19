"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { describedBy, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { createPostAction } from "../actions/feed.actions";
import { POST_BODY_MAX_LENGTH } from "../domain/feed-content-rules";

const HINT = "Plain text only. Members in this feed can read what you post.";

interface PostComposerProps {
  /** null posts to the member-wide feed. */
  groupId: string | null;
}

export function PostComposer({ groupId }: PostComposerProps) {
  const router = useRouter();
  const fieldId = useId();
  const [body, setBody] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remaining = POST_BODY_MAX_LENGTH - body.length;
  const isEmpty = body.trim().length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFieldError(null);
    setFormError(null);
    startTransition(async () => {
      const result = await createPostAction({ groupId, body });
      if (!result.ok) {
        if (result.fieldErrors?.body) {
          setFieldError(result.fieldErrors.body);
        } else {
          setFormError(result.message);
        }
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
      <FormField
        id={fieldId}
        label="Share an update"
        hint={HINT}
        error={fieldError ?? undefined}
      >
        <Textarea
          id={fieldId}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={describedBy(fieldId, HINT, fieldError ?? undefined)}
          className="bg-white"
        />
      </FormField>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={remaining < 0 ? "text-sm font-medium text-brand-danger" : "text-sm text-brand-muted"}
        >
          {remaining} characters left
        </p>
        <Button type="submit" disabled={isPending || isEmpty || remaining < 0}>
          {isPending ? "Posting..." : "Post"}
        </Button>
      </div>
      <FormAlert tone="error" message={formError} />
    </form>
  );
}
