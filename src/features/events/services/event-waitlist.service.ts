import "server-only";

import { ROUTES } from "@/constants/routes";
import { createNotification } from "@/features/notifications/services/notification.service";
import type { Prisma } from "@/generated/prisma/client";

import { selectPromotions } from "../domain/rsvp-rules";

/** With unlimited capacity there is no seat count to bound promotions, so a generous batch limit applies. */
const UNLIMITED_PROMOTION_BATCH = 500;

export interface LockedEvent {
  id: string;
  status: string;
  capacity: number | null;
  rsvpDeadline: Date | null;
  startsAt: Date;
}

/**
 * Locks the event row until the transaction ends. Every seat change for an event runs under this lock, so
 * concurrent RSVPs and cancellations are serialized. Returns null when the event does not exist.
 */
export async function lockEventForUpdate(tx: Prisma.TransactionClient, eventId: string): Promise<LockedEvent | null> {
  const rows = await tx.$queryRaw<LockedEvent[]>`
    SELECT "id", "status"::text AS "status", "capacity", "rsvpDeadline", "startsAt"
    FROM "events"
    WHERE "id" = ${eventId}
    FOR UPDATE`;
  return rows[0] ?? null;
}

/**
 * Moves the earliest waitlisted members into free seats and tells each one. Call only inside the
 * transaction that holds the event lock. Returns the user ids promoted.
 */
export async function promoteWaitlist(
  tx: Prisma.TransactionClient,
  input: { eventId: string; slug: string; title: string; capacity: number | null },
): Promise<string[]> {
  const goingCount = await tx.eventRegistration.count({ where: { eventId: input.eventId, status: "GOING" } });
  const freeSeats =
    input.capacity === null ? UNLIMITED_PROMOTION_BATCH : Math.max(0, input.capacity - goingCount);
  if (freeSeats === 0) {
    return [];
  }

  const queue = await tx.eventRegistration.findMany({
    where: { eventId: input.eventId, status: "WAITLISTED" },
    orderBy: [{ waitlistedAt: "asc" }, { createdAt: "asc" }],
    take: freeSeats,
    select: { userId: true },
  });
  const promoted = selectPromotions({
    capacity: input.capacity,
    goingCount,
    queue: queue.map((row) => row.userId),
  });

  const promotedUserIds: string[] = [];
  for (const userId of promoted) {
    const moved = await tx.eventRegistration.updateMany({
      where: { eventId: input.eventId, userId, status: "WAITLISTED" },
      data: { status: "GOING" },
    });
    if (moved.count !== 1) {
      continue;
    }
    await createNotification(tx, {
      userId,
      kind: "EVENT",
      title: "You have a place",
      body: `A place opened up for ${input.title}. You are now going.`,
      linkPath: `${ROUTES.appEvents}/${input.slug}`,
    });
    promotedUserIds.push(userId);
  }
  return promotedUserIds;
}
