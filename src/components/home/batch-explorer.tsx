"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

interface BatchExplorerProps {
  /** Admin-listed matric years, newest first. Member names and counts are never passed in. */
  years: readonly number[];
}

/**
 * Public batch discovery. Shows general batch information and a sign-in invitation only; member details
 * stay private and are never part of this component's props.
 */
export function BatchExplorer({ years }: BatchExplorerProps) {
  const [selected, setSelected] = useState<number | null>(years[0] ?? null);
  const headingId = useId();

  if (years.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-border bg-brand-surface p-8">
        <p className="max-w-prose text-brand-muted">
          Batches appear here once the school adds them to the catalog. You can still choose{" "}
          <span className="font-semibold text-brand-ink">My batch is not listed</span> during registration, and ask
          for a manual review.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,260px)_1fr]">
      <div role="group" aria-labelledby={headingId} className="flex flex-wrap gap-2 md:flex-col">
        <p id={headingId} className="sr-only">
          Choose a matric year
        </p>
        {years.map((year) => (
          <button
            key={year}
            type="button"
            aria-pressed={selected === year}
            onClick={() => setSelected(year)}
            className="rounded-xl border border-brand-border bg-brand-surface px-5 py-3 text-left font-display text-2xl font-semibold transition-colors duration-200 hover:border-brand-deep aria-pressed:border-brand-deep aria-pressed:bg-brand-deep aria-pressed:text-white"
          >
            Batch {year}
          </button>
        ))}
      </div>

      {selected !== null ? (
        <article
          aria-live="polite"
          className="flex flex-col justify-between gap-6 rounded-[1.25rem] border border-brand-border bg-brand-surface p-8"
        >
          <div className="space-y-3">
            <h3 className="font-display text-3xl font-semibold">Batch {selected}</h3>
            <p className="max-w-prose leading-relaxed text-brand-muted">
              Former students who completed Class 10 in {selected} are welcome to join. Sign in to see classmates from
              this batch, post in the batch space, and find reunion events.
            </p>
          </div>
          <div>
            <Button render={<Link href={`${ROUTES.register}?batch=${selected}`} />}>Join with batch {selected}</Button>
          </div>
        </article>
      ) : null}
    </div>
  );
}
