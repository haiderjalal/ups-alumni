"use client";

import { useState, useTransition, type FormEvent } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { editCommentAction, removeCommentAction, type CommentDisplay } from "../actions/feed.actions";

import { ReportForm } from "./report-form";

interface CommentItemProps {
  comment: CommentDisplay;
  reportReasons: readonly string[];
  onChanged: () => void;
}

export function CommentItem({ comment, reportReasons, onChanged }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEditing(): void {
    setDraft(comment.body);
    setError(null);
    setIsEditing(true);
  }

  function handleSave(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await editCommentAction({ commentId: comment.id, body: draft });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setIsEditing(false);
      onChanged();
    });
  }

  function handleRemove(): void {
    if (!window.confirm("Remove this comment?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await removeCommentAction({ commentId: comment.id });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onChanged();
    });
  }

  return (
    <article className="space-y-2">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-muted">
        <span className="break-words font-semibold text-brand-ink">{comment.authorName}</span>
        <span>{comment.createdLabel}</span>
        {comment.isEdited ? <span>· Edited</span> : null}
      </header>

      {isEditing ? (
        <form onSubmit={handleSave} noValidate className="space-y-2">
          <Textarea
            aria-label="Edit comment"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="bg-white"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={isPending || draft.trim().length === 0}>
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-line break-words text-brand-ink">{comment.body}</p>
      )}

      {!isEditing && (comment.canEdit || comment.canRemove || !comment.isOwn) ? (
        <div className="flex flex-wrap items-center gap-2">
          {comment.canEdit ? (
            <Button size="sm" variant="ghost" onClick={startEditing}>
              Edit
            </Button>
          ) : null}
          {comment.canRemove ? (
            <Button size="sm" variant="ghost" onClick={handleRemove} disabled={isPending}>
              Remove
            </Button>
          ) : null}
          {!comment.isOwn ? <ReportForm targetType="COMMENT" targetId={comment.id} reasons={reportReasons} /> : null}
        </div>
      ) : null}

      <FormAlert tone="error" message={error} />
    </article>
  );
}
