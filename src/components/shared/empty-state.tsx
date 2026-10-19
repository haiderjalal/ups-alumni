import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

/** Honest empty state: says what is missing and what the visitor can do next. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-brand-border bg-brand-surface/70 px-6 py-10 text-center sm:px-10",
        className,
      )}
    >
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <p className="mx-auto mt-3 max-w-prose text-brand-muted">{description}</p>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}
