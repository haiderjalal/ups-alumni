"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";

import { removePostAction, setPostPinnedAction } from "../actions/feed.actions";

import { PostEditForm } from "./post-edit-form";
import { ReportForm } from "./report-form";

interface PostMenuProps {
  postId: string;
  body: string;
  isOwn: boolean;
  canEdit: boolean;
  canRemove: boolean;
  canPin: boolean;
  isPinned: boolean;
  reportReasons: readonly string[];
}

/** Author and moderator actions for one post. Each action is re-checked by the server. */
export function PostMenu({
  postId,
  body,
  isOwn,
  canEdit,
  canRemove,
  canPin,
  isPinned,
  reportReasons,
}: PostMenuProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canReport = !isOwn;
  if (!canEdit && !canRemove && !canPin && !canReport) {
    return null;
  }

  function handleRemove(): void {
    if (!window.confirm("Remove this post? Members will no longer be able to see it.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await removePostAction({ postId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function handlePin(): void {
    setError(null);
    startTransition(async () => {
      const result = await setPostPinnedAction({ postId, pinned: !isPinned });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && !isEditing ? (
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} aria-expanded={false}>
            Edit
          </Button>
        ) : null}
        {canPin ? (
          <Button size="sm" variant="ghost" onClick={handlePin} disabled={isPending}>
            {isPinned ? "Unpin" : "Pin to top"}
          </Button>
        ) : null}
        {canRemove ? (
          <Button size="sm" variant="ghost" onClick={handleRemove} disabled={isPending}>
            Remove
          </Button>
        ) : null}
        {canReport ? <ReportForm targetType="POST" targetId={postId} reasons={reportReasons} /> : null}
      </div>
      {isEditing ? (
        <PostEditForm postId={postId} initialBody={body} onDone={() => setIsEditing(false)} />
      ) : null}
      <FormAlert tone="error" message={error} />
    </div>
  );
}
