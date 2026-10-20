"use client";

import { useId, useState, useTransition, type FormEvent } from "react";

import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { reportContentAction } from "../actions/feed.actions";

interface ReportFormProps {
  targetType: "POST" | "COMMENT";
  targetId: string;
  /** Reason list comes from the server so that it stays in step with the moderation service. */
  reasons: readonly string[];
}

const SELECT_CLASSES =
  "h-9 w-full rounded-lg border border-brand-field bg-white px-2.5 text-sm text-brand-ink outline-none focus-visible:border-brand-deep focus-visible:ring-3 focus-visible:ring-brand-deep/30";

/** Files a report that goes to moderators. The reporter is never told what happens to it. */
export function ReportForm({ targetType, targetId, reasons }: ReportFormProps) {
  const reasonId = useId();
  const detailsId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await reportContentAction({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      setMessage(
        result.data.alreadyOpen
          ? "You have already reported this. A moderator will review it."
          : "Thank you. A moderator will review this report.",
      );
      setIsOpen(false);
      setReason("");
      setDetails("");
    });
  }

  if (message) {
    return <FormAlert tone="success" message={message} />;
  }

  if (!isOpen) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)} aria-expanded={false}>
        Report
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full space-y-3 rounded-xl border border-brand-border bg-brand-lilac p-4">
      <div className="space-y-2">
        <label htmlFor={reasonId} className="text-sm font-semibold text-brand-ink">
          Why are you reporting this?
        </label>
        <select
          id={reasonId}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={SELECT_CLASSES}
          required
        >
          <option value="">Choose a reason</option>
          {reasons.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor={detailsId} className="text-sm font-semibold text-brand-ink">
          Details (optional)
        </label>
        <Textarea
          id={detailsId}
          rows={2}
          maxLength={1000}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          className="bg-white"
        />
      </div>
      <FormAlert tone="error" message={formError} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isPending || reason === ""}>
          {isPending ? "Sending..." : "Send report"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
