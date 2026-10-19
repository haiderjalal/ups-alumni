import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

import {
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_CATEGORY_LABELS,
  REMOTE_TYPE_LABELS,
  REMOTE_TYPES,
  type OpportunityCategoryValue,
  type RemoteTypeValue,
} from "../constants";

interface OpportunityFiltersProps {
  q: string | null;
  category: OpportunityCategoryValue | null;
  remoteType: RemoteTypeValue | null;
  savedOnly: boolean;
}

const SELECT_CLASS =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

/** Plain GET form. Filters live in the URL, so results can be shared and work without JavaScript. */
export function OpportunityFilters({
  q,
  category,
  remoteType,
  savedOnly,
}: OpportunityFiltersProps) {
  const hasFilters = Boolean(q || category || remoteType || savedOnly);

  return (
    <form
      method="get"
      action={ROUTES.appOpportunities}
      className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end"
    >
      <div className="min-w-0 space-y-2">
        <label htmlFor="q" className="text-sm font-semibold text-brand-ink">
          Search by title or organization
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q ?? ""}
          className={SELECT_CLASS}
        />
      </div>

      <div className="min-w-0 space-y-2">
        <label
          htmlFor="category"
          className="text-sm font-semibold text-brand-ink"
        >
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={category ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">All categories</option>
          {OPPORTUNITY_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {OPPORTUNITY_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0 space-y-2">
        <label
          htmlFor="remote"
          className="text-sm font-semibold text-brand-ink"
        >
          Work arrangement
        </label>
        <select
          id="remote"
          name="remote"
          defaultValue={remoteType ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">Any arrangement</option>
          {REMOTE_TYPES.map((value) => (
            <option key={value} value={value}>
              {REMOTE_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <input
            type="checkbox"
            name="saved"
            value="1"
            defaultChecked={savedOnly}
            className="size-4 accent-brand-deep"
          />
          Saved only
        </label>
        <Button type="submit">Apply</Button>
        {hasFilters ? (
          <Link
            href={ROUTES.appOpportunities}
            className="text-sm font-semibold text-brand-deep underline underline-offset-4"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
