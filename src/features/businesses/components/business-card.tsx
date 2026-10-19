import Link from "next/link";

import { ROUTES } from "@/constants/routes";

import type { BusinessCard as BusinessCardData } from "../services/business-directory.service";

export function BusinessCard({ business }: { business: BusinessCardData }) {
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
      <p className="text-sm font-medium text-brand-muted">
        {business.sector} · {business.city}
      </p>
      <h2 className="font-display text-xl font-semibold leading-snug break-words">
        <Link
          href={`${ROUTES.appBusinesses}/${business.slug}`}
          className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          {business.name}
        </Link>
      </h2>
      <p className="line-clamp-3 text-sm leading-relaxed text-brand-muted break-words">
        {business.description}
      </p>
    </article>
  );
}
