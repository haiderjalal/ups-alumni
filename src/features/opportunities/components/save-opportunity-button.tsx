"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";

import {
  saveOpportunityAction,
  unsaveOpportunityAction,
} from "../actions/opportunity.actions";

interface SaveOpportunityButtonProps {
  opportunityId: string;
  initiallySaved: boolean;
}

export function SaveOpportunityButton({
  opportunityId,
  initiallySaved,
}: SaveOpportunityButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState<string | null>(null);

  function toggle(): void {
    setError(null);
    startTransition(async () => {
      const result = saved
        ? await unsaveOpportunityAction(opportunityId)
        : await saveOpportunityAction(opportunityId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSaved(!saved);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Button
        variant={saved ? "secondary" : "outline"}
        aria-pressed={saved}
        onClick={toggle}
        disabled={isPending}
      >
        {isPending ? "Updating…" : saved ? "Saved" : "Save opportunity"}
      </Button>
      <FormAlert tone="error" message={error} />
    </div>
  );
}
