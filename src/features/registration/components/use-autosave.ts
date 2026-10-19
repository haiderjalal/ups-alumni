"use client";

import { useEffect, useRef, useState } from "react";

import type { ActionResult } from "@/types/action";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1500;

/**
 * Saves a form's current values as a server-side draft after the applicant pauses typing. Only changed values
 * are sent, and the first render never saves, so opening a step does not write anything.
 */
export function useAutosave(
  values: object,
  save: (values: unknown) => Promise<ActionResult>,
  enabled = true,
): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const lastSaved = useRef<string | null>(null);
  const serialized = JSON.stringify(values);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (lastSaved.current === null) {
      lastSaved.current = serialized;
      return;
    }
    if (serialized === lastSaved.current) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setStatus("saving");
      try {
        const result = await save(JSON.parse(serialized) as unknown);
        lastSaved.current = serialized;
        setStatus(result.ok ? "saved" : "error");
      } catch {
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
    // `save` is a stable server action reference; only the serialized values should retrigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, enabled]);

  return status;
}

export function autosaveMessage(status: AutosaveStatus): string {
  switch (status) {
    case "saving":
      return "Saving your progress…";
    case "saved":
      return "Progress saved.";
    case "error":
      return "Progress could not be saved. Your answers are still on screen; try again.";
    case "idle":
      return "Your progress is saved as you go.";
  }
}
