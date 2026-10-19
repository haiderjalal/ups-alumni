import "server-only";

import { db } from "@/lib/db";

export interface PublicEventSummary {
  slug: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  locationText: string | null;
}

export interface PublicEventDetail extends PublicEventSummary {
  description: string;
}

const PUBLIC_EVENT_FILTER = { visibility: "PUBLIC" as const, status: "PUBLISHED" as const };

/**
 * Published public events only. Virtual meeting links are members-only and never selected here.
 * Upcoming events are returned soonest first; past events are returned most recent first.
 */
export async function listPublicEvents(options: { upcoming: boolean; limit: number }): Promise<PublicEventSummary[]> {
  const now = new Date();
  return db.event.findMany({
    where: {
      ...PUBLIC_EVENT_FILTER,
      startsAt: options.upcoming ? { gte: now } : { lt: now },
    },
    orderBy: { startsAt: options.upcoming ? "asc" : "desc" },
    take: Math.min(Math.max(options.limit, 1), 50),
    select: { slug: true, title: true, startsAt: true, endsAt: true, timezone: true, locationText: true },
  });
}

export async function getPublicEventBySlug(slug: string): Promise<PublicEventDetail | null> {
  return db.event.findFirst({
    where: { ...PUBLIC_EVENT_FILTER, slug },
    select: {
      slug: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      locationText: true,
    },
  });
}
