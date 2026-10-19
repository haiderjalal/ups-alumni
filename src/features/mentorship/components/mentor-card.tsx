import Link from "next/link";

import { ROUTES } from "@/constants/routes";

import type { MentorCard as MentorCardData } from "../services/mentor-directory.service";

export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  return (
    <article className="flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold leading-snug break-words">
        <Link
          href={`${ROUTES.appMentorship}/${mentor.profileId}`}
          className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          {mentor.name}
        </Link>
      </h2>
      <p className="line-clamp-3 text-sm leading-relaxed text-brand-ink break-words">
        {mentor.expertise}
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="Topics">
        {mentor.topics.map((topic) => (
          <li
            key={topic}
            className="rounded-full bg-brand-sage px-3 py-1 text-xs font-medium capitalize text-brand-ink"
          >
            {topic}
          </li>
        ))}
      </ul>
      <p className="mt-auto text-sm text-brand-muted">
        {mentor.acceptingRequests
          ? "Accepting requests"
          : "At capacity right now"}
      </p>
    </article>
  );
}
