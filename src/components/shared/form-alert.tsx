import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface FormAlertProps {
  tone: "error" | "success" | "info";
  message: string | null;
  className?: string;
}

/** Form-level status message. Renders nothing when there is no message. */
export function FormAlert({ tone, message, className }: FormAlertProps) {
  if (!message) {
    return null;
  }
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        tone === "error" && "border-brand-danger/30 bg-brand-danger/5 text-brand-danger",
        tone === "success" && "border-brand-success/30 bg-brand-success/5 text-brand-success",
        tone === "info" && "border-brand-border bg-brand-lilac text-brand-ink",
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
