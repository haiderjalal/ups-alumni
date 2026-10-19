import { AlertCircle } from "lucide-react";

interface StepErrorSummaryProps {
  message: string | null;
  fieldErrors: Record<string, string>;
}

/** Summary above a step form. Each entry links to its field, so keyboard and screen-reader users reach it. */
export function StepErrorSummary({ message, fieldErrors }: StepErrorSummaryProps) {
  const entries = Object.entries(fieldErrors);
  if (!message && entries.length === 0) {
    return null;
  }

  return (
    <div role="alert" className="rounded-xl border border-brand-danger/30 bg-brand-danger/5 p-4 text-sm text-brand-danger">
      <p className="flex items-center gap-2 font-semibold">
        <AlertCircle aria-hidden="true" className="size-4" />
        {message ?? "Please correct the highlighted fields."}
      </p>
      {entries.length > 0 ? (
        <ul className="mt-2 list-inside list-disc space-y-1">
          {entries.map(([field, text]) => (
            <li key={field}>
              <a href={`#${field}`} className="underline underline-offset-4">
                {text}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
