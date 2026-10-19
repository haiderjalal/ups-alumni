"use client";

import { useId, useState, useTransition, type FormEvent } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { describedBy, FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { createCommentAction } from "../actions/feed.actions";
import { COMMENT_BODY_MAX_LENGTH } from "../domain/feed-content-rules";

interface CommentFormProps {
  postId: string;
  onPosted: () => void;
}

export function CommentForm({ postId, onPosted }: CommentFormProps) {
  const fieldId = useId();
  const [body, setBody] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFieldError(null);
    setFormError(null);
    startTransition(async () => {
      const result = await createCommentAction({ postId, body });
      if (!result.ok) {
        if (result.fieldErrors?.body) {
          setFieldError(result.fieldErrors.body);
        } else {
          setFormError(result.message);
        }
        return;
      }
      setBody("");
      onPosted();
    });
  }

  const hint = `Up to ${COMMENT_BODY_MAX_LENGTH} characters.`;
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <FormField id={fieldId} label="Add a comment" hint={hint} error={fieldError ?? undefined}>
        <Textarea
          id={fieldId}
          rows={2}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, fieldError ?? undefined)}
          className="bg-white"
        />
      </FormField>
      <FormAlert tone="error" message={formError} />
      <Button type="submit" size="sm" disabled={isPending || body.trim().length === 0}>
        {isPending ? "Posting..." : "Comment"}
      </Button>
    </form>
  );
}
