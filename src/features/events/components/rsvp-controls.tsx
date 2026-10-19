"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";

import { cancelEventRsvpAction, rsvpToEventAction } from "../actions/event.actions";
import type { RsvpPrompt } from "../domain/rsvp-rules";

interface RsvpControlsProps {
  slug: string;
  prompt: RsvpPrompt;
  viewerStatus: "GOING" | "WAITLISTED" | null;
  deadlineLabel: string;
}

/** Registration controls. The server decides every outcome; these labels only describe the viewer's options. */
export function RsvpControls({ slug, prompt, viewerStatus, deadlineLabel }: RsvpControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleJoin(): void {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await rsvpToEventAction({ slug });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.data.status === "GOING" ? "You are going to this event." : "You are on the waitlist.");
      router.refresh();
    });
  }

  function handleCancel(): void {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await cancelEventRsvpAction({ slug });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice("Your registration has been cancelled.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {prompt === "CANCEL" ? (
        <p className="text-brand-ink">
          {viewerStatus === "GOING" ? "You are going to this event." : "You are on the waitlist."}
        </p>
      ) : null}
      {prompt === "JOIN" ? <p className="text-brand-ink">Seats are available.</p> : null}
      {prompt === "JOIN_WAITLIST" ? (
        <p className="text-brand-ink">
          This event is full. Join the waitlist and you will be moved up if a seat opens.
        </p>
      ) : null}
      {prompt === "CLOSED" ? <p className="text-brand-ink">Registration closed {deadlineLabel}.</p> : null}
      {prompt === "UNAVAILABLE" ? <p className="text-brand-ink">Registration is not open for this event.</p> : null}

      <div className="flex flex-wrap gap-3">
        {prompt === "CANCEL" ? (
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            {isPending ? "Cancelling..." : viewerStatus === "GOING" ? "Cancel my RSVP" : "Leave the waitlist"}
          </Button>
        ) : null}
        {prompt === "JOIN" ? (
          <Button onClick={handleJoin} disabled={isPending}>
            {isPending ? "Saving..." : "I am going"}
          </Button>
        ) : null}
        {prompt === "JOIN_WAITLIST" ? (
          <Button onClick={handleJoin} disabled={isPending}>
            {isPending ? "Saving..." : "Join the waitlist"}
          </Button>
        ) : null}
      </div>

      <FormAlert tone="error" message={error} />
      <FormAlert tone="success" message={notice} />
    </div>
  );
}
