import "server-only";

import { db } from "@/lib/db";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { canRegisterForEvent, type EventViewer } from "../domain/event-visibility";
import { decideRsvp, effectiveRsvpDeadline } from "../domain/rsvp-rules";

import { lockEventForUpdate, promoteWaitlist } from "./event-waitlist.service";

const EVENT_UNAVAILABLE = "This event is not available.";

export interface RsvpOutcome {
  status: "GOING" | "WAITLISTED";
}

/**
 * Registers the viewer for a published event. The event row is locked first, so the seat count, the
 * deadline check and the write happen as one step. A full event admits the member to the waitlist.
 * Repeating the request returns the current status without changing it.
 */
export async function rsvpToEvent(input: { slug: string; viewer: EventViewer }): Promise<ActionResult<RsvpOutcome>> {
  const event = await db.event.findUnique({
    where: { slug: input.slug },
    select: {
      id: true,
      status: true,
      visibility: true,
      batchId: true,
      organizerId: true,
    },
  });
  if (!event || !canRegisterForEvent(event, input.viewer)) {
    return actionError(EVENT_UNAVAILABLE);
  }

  return db.$transaction(async (tx): Promise<ActionResult<RsvpOutcome>> => {
    const locked = await lockEventForUpdate(tx, event.id);
    if (!locked || locked.status !== "PUBLISHED") {
      return actionError("This event is no longer open for registration.");
    }

    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: input.viewer.userId } },
      select: { status: true },
    });
    if (existing?.status === "GOING") {
      return actionOk({ status: "GOING" });
    }
    if (existing?.status === "WAITLISTED") {
      // A waitlisted member keeps their place in the queue rather than jumping ahead of others.
      return actionOk({ status: "WAITLISTED" });
    }

    const goingCount = await tx.eventRegistration.count({ where: { eventId: event.id, status: "GOING" } });
    const now = new Date();
    const decision = decideRsvp({
      capacity: locked.capacity,
      goingCount,
      deadline: effectiveRsvpDeadline(locked.rsvpDeadline, locked.startsAt),
      now,
    });
    if (decision.outcome === "REJECT") {
      return actionError("Registration for this event has closed.");
    }

    const status = decision.outcome === "GOING" ? "GOING" : "WAITLISTED";
    const waitlistedAt = status === "WAITLISTED" ? now : null;
    if (existing) {
      // A cancelled registration is reopened in place, so each member has exactly one row per event.
      const reopened = await tx.eventRegistration.updateMany({
        where: { eventId: event.id, userId: input.viewer.userId, status: "CANCELLED" },
        data: { status, waitlistedAt },
      });
      if (reopened.count !== 1) {
        return actionError("Your registration changed. Refresh the page and try again.");
      }
    } else {
      await tx.eventRegistration.create({
        data: { eventId: event.id, userId: input.viewer.userId, status, waitlistedAt },
      });
    }
    return actionOk({ status });
  });
}

/**
 * Cancels the viewer's registration. Cancelling a GOING seat promotes the earliest waitlisted member in the
 * same transaction. Cancelling after the event is cancelled frees no seat to promote into.
 */
export async function cancelEventRsvp(input: { slug: string; userId: string }): Promise<ActionResult> {
  const event = await db.event.findUnique({
    where: { slug: input.slug },
    select: { id: true, slug: true, title: true },
  });
  if (!event) {
    return actionError(EVENT_UNAVAILABLE);
  }

  return db.$transaction(async (tx): Promise<ActionResult> => {
    const locked = await lockEventForUpdate(tx, event.id);
    if (!locked) {
      return actionError(EVENT_UNAVAILABLE);
    }

    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: input.userId } },
      select: { status: true },
    });
    if (!existing || existing.status === "CANCELLED") {
      return actionOk();
    }

    const cancelled = await tx.eventRegistration.updateMany({
      where: { eventId: event.id, userId: input.userId, status: existing.status },
      data: { status: "CANCELLED" },
    });
    if (cancelled.count !== 1) {
      return actionError("Your registration changed. Refresh the page and try again.");
    }

    if (existing.status === "GOING" && locked.status === "PUBLISHED") {
      await promoteWaitlist(tx, {
        eventId: event.id,
        slug: event.slug,
        title: event.title,
        capacity: locked.capacity,
      });
    }
    return actionOk();
  });
}
