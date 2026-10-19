"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/types/action";

import {
  acceptMentorshipRequestAction,
  declineMentorshipRequestAction,
  endMentorshipAction,
  withdrawMentorshipRequestAction,
} from "../actions/mentorship.actions";

type MentorshipActionsProps =
  | { variant: "incoming"; requestId: string }
  | { variant: "outgoing"; requestId: string }
  | { variant: "active"; mentorshipId: string };

/** Buttons only. Every server action re-checks ownership and state, so these are not the authorization. */
export function MentorshipRequestActions(props: MentorshipActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(task: () => Promise<ActionResult<unknown>>): void {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function confirmAndEnd(outcome: "COMPLETED" | "CANCELLED"): void {
    if (props.variant !== "active") {
      return;
    }
    if (
      outcome === "CANCELLED" &&
      !window.confirm("End this mentorship now? This cannot be undone.")
    ) {
      return;
    }
    run(() => endMentorshipAction(props.mentorshipId, outcome));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {props.variant === "incoming" ? (
          <>
            <Button
              disabled={isPending}
              onClick={() =>
                run(() => acceptMentorshipRequestAction(props.requestId))
              }
            >
              Accept request
            </Button>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() => declineMentorshipRequestAction(props.requestId))
              }
            >
              Decline
            </Button>
          </>
        ) : null}
        {props.variant === "outgoing" ? (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() =>
              run(() => withdrawMentorshipRequestAction(props.requestId))
            }
          >
            Withdraw request
          </Button>
        ) : null}
        {props.variant === "active" ? (
          <>
            <Button
              disabled={isPending}
              onClick={() => confirmAndEnd("COMPLETED")}
            >
              Mark as complete
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => confirmAndEnd("CANCELLED")}
            >
              End mentorship
            </Button>
          </>
        ) : null}
      </div>
      <FormAlert tone="error" message={error} />
    </div>
  );
}
