import "server-only";

import { db } from "@/lib/db";
import { toSafeHttpUrl } from "@/lib/security/text";
import type { EventStatus, EventVisibility, Prisma, RsvpStatus } from "@/generated/prisma/client";

import {
  canManageEvent,
  canRegisterForEvent,
  canSeeVirtualLink,
  canViewEvent,
  type EventViewer,
} from "../domain/event-visibility";
import { effectiveRsvpDeadline } from "../domain/rsvp-rules";

const MAX_LIST_LIMIT = 100;

export interface MemberEventSummary {
  id: string;
  slug: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  locationText: string | null;
  visibility: EventVisibility;
  capacity: number | null;
  goingCount: number;
  viewerStatus: RsvpStatus | null;
}

export interface EventRosterRow {
  userId: string;
  name: string;
  status: RsvpStatus;
  waitlistedAt: Date | null;
  attendedAt: Date | null;
}

export interface MemberEventDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  locationText: string | null;
  /** Safe http(s) link, shown only to people going and to the organizer. */
  virtualUrl: string | null;
  visibility: EventVisibility;
  batchYear: number | null;
  status: EventStatus;
  capacity: number | null;
  rsvpDeadline: Date | null;
  /** The deadline that applies: the explicit one, or the start time when none is set. */
  effectiveDeadline: Date;
  organizerName: string;
  goingCount: number;
  waitlistCount: number;
  viewerStatus: RsvpStatus | null;
  /** The viewer may register now: published and admitted by the audience. Managers may view drafts they cannot register for. */
  canRegister: boolean;
  canManage: boolean;
  /** Attendance roster for managers only. Null for everyone else. */
  roster: EventRosterRow[] | null;
  updatedAt: Date;
}

/** Published events the viewer may see, soonest first when upcoming, most recent first otherwise. */
export async function listMemberEvents(input: {
  viewer: EventViewer;
  upcoming: boolean;
  limit: number;
}): Promise<MemberEventSummary[]> {
  const now = new Date();
  const audience: Prisma.EventWhereInput[] = [{ visibility: { in: ["PUBLIC", "MEMBERS"] } }];
  if (input.viewer.batchId) {
    audience.push({ visibility: "BATCH", batchId: input.viewer.batchId });
  }
  const timing: Prisma.EventWhereInput = input.upcoming
    ? { OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: now } }] }
    : { OR: [{ endsAt: { lt: now } }, { endsAt: null, startsAt: { lt: now } }] };

  const rows = await db.event.findMany({
    where: { status: "PUBLISHED", AND: [{ OR: audience }, timing] },
    orderBy: [{ startsAt: input.upcoming ? "asc" : "desc" }, { id: "asc" }],
    take: Math.min(Math.max(input.limit, 1), MAX_LIST_LIMIT),
    select: {
      id: true,
      slug: true,
      title: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      locationText: true,
      visibility: true,
      capacity: true,
      status: true,
      batchId: true,
      organizerId: true,
    },
  });
  // The query applies the audience rule; the domain check keeps one definition of it as a safety net.
  const visible = rows.filter((row) => canViewEvent(row, input.viewer));
  if (visible.length === 0) {
    return [];
  }

  const eventIds = visible.map((row) => row.id);
  const [goingTotals, ownRegistrations] = await Promise.all([
    db.eventRegistration.groupBy({
      by: ["eventId"],
      where: { eventId: { in: eventIds }, status: "GOING" },
      _count: { _all: true },
    }),
    db.eventRegistration.findMany({
      where: { userId: input.viewer.userId, eventId: { in: eventIds } },
      select: { eventId: true, status: true },
    }),
  ]);
  const goingCounts = new Map(goingTotals.map((row) => [row.eventId, row._count._all]));
  const viewerStatuses = new Map(ownRegistrations.map((row) => [row.eventId, row.status]));

  return visible.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    timezone: row.timezone,
    locationText: row.locationText,
    visibility: row.visibility,
    capacity: row.capacity,
    goingCount: goingCounts.get(row.id) ?? 0,
    viewerStatus: viewerStatuses.get(row.id) ?? null,
  }));
}

/** Event detail for the viewer, or null when the viewer may not see it (callers show "not found"). */
export async function getMemberEventDetail(input: {
  slug: string;
  viewer: EventViewer;
}): Promise<MemberEventDetail | null> {
  const event = await db.event.findUnique({
    where: { slug: input.slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      locationText: true,
      virtualUrl: true,
      visibility: true,
      batchId: true,
      capacity: true,
      rsvpDeadline: true,
      status: true,
      organizerId: true,
      updatedAt: true,
      organizer: { select: { name: true } },
      batch: { select: { year: true } },
    },
  });
  if (!event || !canViewEvent(event, input.viewer)) {
    return null;
  }

  const canManage = canManageEvent(event, input.viewer);
  const [goingCount, waitlistCount, ownRegistration, rosterRows] = await Promise.all([
    db.eventRegistration.count({ where: { eventId: event.id, status: "GOING" } }),
    db.eventRegistration.count({ where: { eventId: event.id, status: "WAITLISTED" } }),
    db.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: input.viewer.userId } },
      select: { status: true },
    }),
    canManage
      ? db.eventRegistration.findMany({
          where: { eventId: event.id, status: { in: ["GOING", "WAITLISTED"] } },
          orderBy: { createdAt: "asc" },
          select: {
            userId: true,
            status: true,
            waitlistedAt: true,
            attendedAt: true,
            user: { select: { name: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  const viewerStatus = ownRegistration?.status ?? null;
  const isGoing = viewerStatus === "GOING";
  const safeVirtualUrl = event.virtualUrl ? toSafeHttpUrl(event.virtualUrl) : null;

  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    locationText: event.locationText,
    virtualUrl: canSeeVirtualLink(event, input.viewer, isGoing) ? safeVirtualUrl : null,
    visibility: event.visibility,
    batchYear: event.batch?.year ?? null,
    status: event.status,
    capacity: event.capacity,
    rsvpDeadline: event.rsvpDeadline,
    effectiveDeadline: effectiveRsvpDeadline(event.rsvpDeadline, event.startsAt),
    organizerName: event.organizer.name,
    goingCount,
    waitlistCount,
    viewerStatus,
    canRegister: canRegisterForEvent(event, input.viewer),
    canManage,
    roster: rosterRows ? toRoster(rosterRows) : null,
    updatedAt: event.updatedAt,
  };
}

function toRoster(
  rows: Array<{
    userId: string;
    status: RsvpStatus;
    waitlistedAt: Date | null;
    attendedAt: Date | null;
    user: { name: string };
  }>,
): EventRosterRow[] {
  const toRow = (row: (typeof rows)[number]): EventRosterRow => ({
    userId: row.userId,
    name: row.user.name,
    status: row.status,
    waitlistedAt: row.waitlistedAt,
    attendedAt: row.attendedAt,
  });
  const going = rows.filter((row) => row.status === "GOING").map(toRow);
  const waitlisted = rows
    .filter((row) => row.status === "WAITLISTED")
    .sort((a, b) => (a.waitlistedAt?.getTime() ?? 0) - (b.waitlistedAt?.getTime() ?? 0))
    .map(toRow);
  return [...going, ...waitlisted];
}
