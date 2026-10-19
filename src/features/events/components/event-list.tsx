import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ROUTES } from "@/constants/routes";
import { formatDateTime } from "@/lib/time";

import type { RsvpStatus } from "@/generated/prisma/client";

import type { MemberEventSummary } from "../services/event-query.service";

interface EventListProps {
  events: MemberEventSummary[];
  emptyTitle: string;
  emptyDescription: string;
}

/** Cancelled registrations show no badge, so the viewer sees only the states that matter to them. */
const VIEWER_STATUS_LABELS: Record<RsvpStatus, string | null> = {
  GOING: "You are going",
  WAITLISTED: "On the waitlist",
  CANCELLED: null,
};

const VISIBILITY_LABELS: Record<MemberEventSummary["visibility"], string> = {
  PUBLIC: "Public",
  MEMBERS: "Members",
  BATCH: "Batch only",
};

export function EventList({ events, emptyTitle, emptyDescription }: EventListProps) {
  if (events.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="divide-y divide-brand-border border-y border-brand-border">
      {events.map((event) => (
        <li key={event.id} className="min-w-0 py-5">
          <article className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h2 className="font-display text-2xl font-semibold leading-tight break-words">
                <Link
                  href={`${ROUTES.appEvents}/${event.slug}`}
                  className="rounded-md underline-offset-4 hover:text-brand-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
                >
                  {event.title}
                </Link>
              </h2>
              <p className="text-sm text-brand-muted">
                {formatDateTime(event.startsAt, event.timezone)}
                {event.locationText ? ` · ${event.locationText}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{VISIBILITY_LABELS[event.visibility]}</Badge>
                <span className="text-sm text-brand-muted">
                  {event.goingCount} going{event.capacity ? ` of ${event.capacity}` : ""}
                </span>
                {event.viewerStatus && VIEWER_STATUS_LABELS[event.viewerStatus] ? (
                  <Badge variant="secondary">{VIEWER_STATUS_LABELS[event.viewerStatus]}</Badge>
                ) : null}
              </div>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
