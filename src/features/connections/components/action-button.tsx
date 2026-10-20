"use client";

import { useState, useTransition } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/types/action";

interface ActionButtonProps<T> {
  label: string;
  pendingLabel: string;
  run: () => Promise<ActionResult<T>>;
  onSuccess?: (data: T) => void;
  variant?: "default" | "outline" | "destructive" | "ghost";
  /** Adds an in-place confirmation step, for changes that remove a connection or block someone. */
  confirmation?: { prompt: string; confirmLabel: string };
  /** Full context for screen readers, for example "Accept request from Ali Khan". */
  accessibleLabel?: string;
}

/**
 * Runs one Server Action with pending and error states. Errors stay visible next to the control, and the
 * confirmation step is reachable and dismissible from the keyboard.
 */
export function ActionButton<T>({
  label,
  pendingLabel,
  run,
  onSuccess,
  variant = "outline",
  confirmation,
  accessibleLabel,
}: ActionButtonProps<T>) {
  const [isPending, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function execute(): void {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setIsConfirming(false);
      onSuccess?.(result.data);
    });
  }

  if (confirmation && isConfirming) {
    return (
      <div className="w-full space-y-3 rounded-xl border border-brand-border bg-brand-lilac/60 p-4">
        <p className="text-sm leading-relaxed text-brand-ink">{confirmation.prompt}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="lg" variant="destructive" disabled={isPending} onClick={execute}>
            {isPending ? pendingLabel : confirmation.confirmLabel}
          </Button>
          <Button type="button" size="lg" variant="ghost" disabled={isPending} onClick={() => setIsConfirming(false)}>
            Cancel
          </Button>
        </div>
        <FormAlert tone="error" message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        variant={variant}
        disabled={isPending}
        aria-label={accessibleLabel}
        aria-busy={isPending}
        onClick={() => (confirmation ? setIsConfirming(true) : execute())}
      >
        {isPending ? pendingLabel : label}
      </Button>
      <FormAlert tone="error" message={error} />
    </div>
  );
}
