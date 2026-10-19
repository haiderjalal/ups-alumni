"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";

import { loadCommentsAction, type CommentDisplay } from "../actions/feed.actions";

import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

interface CommentThreadProps {
  postId: string;
  commentCount: number;
  canParticipate: boolean;
  reportReasons: readonly string[];
}

/** Comments load when first opened, so a feed page does not fetch every thread up front. */
export function CommentThread({ postId, commentCount, canParticipate, reportReasons }: CommentThreadProps) {
  const router = useRouter();
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState<CommentDisplay[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();

  function loadComments(): void {
    setLoadError(null);
    startLoading(async () => {
      const result = await loadCommentsAction({ postId });
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setComments(result.data);
    });
  }

  function handleToggle(): void {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && comments === null) {
      loadComments();
    }
  }

  function handleChanged(): void {
    loadComments();
    router.refresh();
  }

  return (
    <div className="w-full">
      <Button variant="ghost" size="sm" onClick={handleToggle} aria-expanded={isOpen} aria-controls={panelId}>
        {isOpen ? "Hide comments" : `Comments · ${commentCount}`}
      </Button>

      {isOpen ? (
        <div id={panelId} className="mt-4 space-y-5 border-l-2 border-brand-border pl-4">
          {isLoading && comments === null ? <p className="text-sm text-brand-muted">Loading comments...</p> : null}
          <FormAlert tone="error" message={loadError} />

          {comments !== null && comments.length === 0 ? (
            <p className="text-sm text-brand-muted">No comments yet.</p>
          ) : null}
          {comments !== null && comments.length > 0 ? (
            <ul className="space-y-5">
              {comments.map((comment) => (
                <li key={comment.id}>
                  <CommentItem comment={comment} reportReasons={reportReasons} onChanged={handleChanged} />
                </li>
              ))}
            </ul>
          ) : null}

          {canParticipate ? (
            <CommentForm postId={postId} onPosted={handleChanged} />
          ) : (
            <p className="text-sm text-brand-muted">You can read comments here, but you cannot add one in this feed.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
