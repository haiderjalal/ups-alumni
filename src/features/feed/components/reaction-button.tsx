"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { toggleReactionAction } from "../actions/feed.actions";

interface ReactionButtonProps {
  postId: string;
  reactionCount: number;
  viewerHasReacted: boolean;
  disabled: boolean;
}

/** One reaction per member per post. Pressing again removes it. */
export function ReactionButton({ postId, reactionCount, viewerHasReacted, disabled }: ReactionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(): void {
    setError(null);
    startTransition(async () => {
      const result = await toggleReactionAction({ postId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={viewerHasReacted ? "secondary" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={disabled || isPending}
        aria-pressed={viewerHasReacted}
      >
        Appreciate · {reactionCount}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-brand-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
