import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

interface MentorSearchFormProps {
  topic: string | null;
  q: string | null;
}

const INPUT_CLASS =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

/** Plain GET form, so search works without JavaScript and results can be shared by URL. */
export function MentorSearchForm({ topic, q }: MentorSearchFormProps) {
  return (
    <form
      method="get"
      action={ROUTES.appMentorship}
      className="grid gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <div className="min-w-0 space-y-2">
        <label htmlFor="topic" className="text-sm font-semibold text-brand-ink">
          Topic
        </label>
        <input
          id="topic"
          name="topic"
          type="text"
          defaultValue={topic ?? ""}
          placeholder="For example: finance"
          className={INPUT_CLASS}
        />
      </div>

      <div className="min-w-0 space-y-2">
        <label htmlFor="q" className="text-sm font-semibold text-brand-ink">
          Search expertise
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q ?? ""}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Search</Button>
        {topic || q ? (
          <Link
            href={ROUTES.appMentorship}
            className="text-sm font-semibold text-brand-deep underline underline-offset-4"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
