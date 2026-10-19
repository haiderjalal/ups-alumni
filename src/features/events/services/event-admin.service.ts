import "server-only";

import { randomBytes } from "node:crypto";

import { recordAudit } from "@/features/audit/services/audit.service";
import { firstIssueMessage, toFieldErrors } from "@/features/feed/validation/field-errors";
import { createNotification } from "@/features/notifications/services/notification.service";
import { ROUTES } from "@/constants/routes";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { toSafeHttpUrl } from "@/lib/security/text";
import { actionError, actionOk, type ActionResult } from "@/types/action";
import type { Prisma, StaffRole } from "@/generated/prisma/client";

import { canTransitionEventStatus } from "../domain/event-status";
import { resolveEventSchedule, type EventSchedule, type ScheduleFieldErrors } from "../domain/event-schedule";
import { buildEventSlug } from "../domain/event-slug";
import type { EventPublicationStatus } from "../domain/event-visibility";
import { createEventSchema, setEventStatusSchema, updateEventSchema } from "../validation/event.schema";

import { lockEventForUpdate, promoteWaitlist } from "./event-waitlist.service";

/** Staff who manage member events. Organizers who are not staff can record attendance but not edit events. */
export const EVENT_ADMIN_ROLES: readonly StaffRole[] = ["SUPER_ADMIN", "CONTENT_MODERATOR"];

const MAX_SLUG_ATTEMPTS = 3;
const INVALID_FIELDS = "Check the highlighted fields.";
const NO_PERMISSION = "You do not have permission to manage events.";
const EVENT_UNAVAILABLE = "This event is not available.";

export interface EventAdminActor {
  userId: string;
  roles: readonly StaffRole[];
}

/** Fields the admin forms submit, after Zod validation. Times are still local wall-clock text. */
interface EventWriteValues {
  startsAtLocal: string;
  endsAtLocal: string | null;
  rsvpDeadlineLocal: string | null;
  timezone: string;
  virtualUrl: string | null;
  visibility: "PUBLIC" | "MEMBERS" | "BATCH";
  batchId: string | null;
}

type ResolvedWriteValues =
  | { ok: true; schedule: EventSchedule; virtualUrl: string | null; batchId: string | null }
  | { ok: false; fieldErrors: Record<string, string> };

function canAdministerEvents(actor: EventAdminActor): boolean {
  return actor.roles.some((role) => EVENT_ADMIN_ROLES.includes(role));
}

/** Creates an event as the acting staff member. The slug is generated once and never changes afterwards. */
export async function createEvent(input: {
  actor: EventAdminActor;
  values: unknown;
}): Promise<ActionResult<{ eventId: string; slug: string }>> {
  if (!canAdministerEvents(input.actor)) {
    return actionError(NO_PERMISSION);
  }
  const parsed = createEventSchema.safeParse(input.values);
  if (!parsed.success) {
    return actionError(firstIssueMessage(parsed.error, INVALID_FIELDS), toFieldErrors(parsed.error));
  }

  const values = parsed.data;
  const resolved = await resolveWriteValues(values);
  if (!resolved.ok) {
    return actionError(INVALID_FIELDS, resolved.fieldErrors);
  }

  const slug = await generateUniqueSlug(values.title);
  if (!slug) {
    return actionError("We could not create a link for this event. Try again.");
  }

  const event = await db.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        slug,
        title: values.title,
        description: values.description,
        startsAt: resolved.schedule.startsAt,
        endsAt: resolved.schedule.endsAt,
        timezone: values.timezone,
        locationText: values.locationText,
        virtualUrl: resolved.virtualUrl,
        visibility: values.visibility,
        batchId: resolved.batchId,
        capacity: values.capacity,
        rsvpDeadline: resolved.schedule.rsvpDeadline,
        status: values.status,
        organizerId: input.actor.userId,
      },
      select: { id: true, slug: true },
    });
    await recordAudit(tx, {
      action: "event.created",
      entityType: "event",
      entityId: created.id,
      actorId: input.actor.userId,
      actorRoles: input.actor.roles,
      metadata: { status: values.status, visibility: values.visibility },
    });
    return created;
  });

  log("info", "event.created", { eventId: event.id });
  return actionOk({ eventId: event.id, slug: event.slug });
}

/**
 * Updates event details. Raising capacity, or removing it, promotes waitlisted members. Lowering
 * capacity never removes anyone who is already going.
 */
export async function updateEvent(input: {
  actor: EventAdminActor;
  eventId: string;
  values: unknown;
}): Promise<ActionResult> {
  if (!canAdministerEvents(input.actor)) {
    return actionError(NO_PERMISSION);
  }
  const parsed = updateEventSchema.safeParse(input.values);
  if (!parsed.success) {
    return actionError(firstIssueMessage(parsed.error, INVALID_FIELDS), toFieldErrors(parsed.error));
  }

  const values = parsed.data;
  const resolved = await resolveWriteValues(values);
  if (!resolved.ok) {
    return actionError(INVALID_FIELDS, resolved.fieldErrors);
  }

  return db.$transaction(async (tx): Promise<ActionResult> => {
    const locked = await lockEventForUpdate(tx, input.eventId);
    if (!locked) {
      return actionError(EVENT_UNAVAILABLE);
    }

    const event = await tx.event.update({
      where: { id: input.eventId },
      data: {
        title: values.title,
        description: values.description,
        startsAt: resolved.schedule.startsAt,
        endsAt: resolved.schedule.endsAt,
        timezone: values.timezone,
        locationText: values.locationText,
        virtualUrl: resolved.virtualUrl,
        visibility: values.visibility,
        batchId: resolved.batchId,
        capacity: values.capacity,
        rsvpDeadline: resolved.schedule.rsvpDeadline,
      },
      select: { slug: true },
    });

    const seatsOpened =
      values.capacity === null
        ? locked.capacity !== null
        : locked.capacity !== null && values.capacity > locked.capacity;
    if (seatsOpened) {
      await promoteWaitlist(tx, {
        eventId: input.eventId,
        slug: event.slug,
        title: values.title,
        capacity: values.capacity,
      });
    }

    await recordAudit(tx, {
      action: "event.updated",
      entityType: "event",
      entityId: input.eventId,
      actorId: input.actor.userId,
      actorRoles: input.actor.roles,
    });
    return actionOk();
  });
}

/**
 * Publishes or cancels an event. Cancelling notifies everyone who is going or waiting, in the same
 * transaction. Registrations are kept, so the roster stays an accurate record.
 */
export async function setEventStatus(input: {
  actor: EventAdminActor;
  eventId: string;
  status: EventPublicationStatus;
}): Promise<ActionResult> {
  if (!canAdministerEvents(input.actor)) {
    return actionError(NO_PERMISSION);
  }
  const parsed = setEventStatusSchema.safeParse({ eventId: input.eventId, status: input.status });
  if (!parsed.success) {
    return actionError("Choose a valid status.");
  }

  return db.$transaction(async (tx): Promise<ActionResult> => {
    const locked = await lockEventForUpdate(tx, input.eventId);
    if (!locked) {
      return actionError(EVENT_UNAVAILABLE);
    }

    const from = locked.status as EventPublicationStatus;
    const to = parsed.data.status;
    if (!canTransitionEventStatus(from, to)) {
      return actionError("This status change is not allowed.");
    }

    const updated = await tx.event.updateMany({
      where: { id: input.eventId, status: from },
      data: { status: to },
    });
    if (updated.count !== 1) {
      return actionError("This event changed while you were editing it. Refresh and try again.");
    }

    if (to === "CANCELLED") {
      await notifyRegistrantsOfCancellation(tx, input.eventId);
    }

    await recordAudit(tx, {
      action: "event.status_changed",
      entityType: "event",
      entityId: input.eventId,
      actorId: input.actor.userId,
      actorRoles: input.actor.roles,
      metadata: { from, to },
    });
    return actionOk();
  });
}

/** Converts local times to UTC, checks the batch, and normalizes the join link. */
async function resolveWriteValues(values: EventWriteValues): Promise<ResolvedWriteValues> {
  const scheduleResult = resolveEventSchedule({
    startsAtLocal: values.startsAtLocal,
    endsAtLocal: values.endsAtLocal,
    rsvpDeadlineLocal: values.rsvpDeadlineLocal,
    timezone: values.timezone,
  });
  if (!scheduleResult.ok) {
    return { ok: false, fieldErrors: presentErrors(scheduleResult.fieldErrors) };
  }

  const batchId = values.visibility === "BATCH" ? values.batchId : null;
  if (values.visibility === "BATCH") {
    if (!batchId) {
      return { ok: false, fieldErrors: { batchId: "Choose a batch for a batch-only event." } };
    }
    const batch = await db.batch.findUnique({ where: { id: batchId }, select: { id: true } });
    if (!batch) {
      return { ok: false, fieldErrors: { batchId: "Choose a batch that exists." } };
    }
  }

  const virtualUrl = values.virtualUrl ? toSafeHttpUrl(values.virtualUrl) : null;
  if (values.virtualUrl && !virtualUrl) {
    return { ok: false, fieldErrors: { virtualUrl: "Enter a valid http or https link." } };
  }

  return { ok: true, schedule: scheduleResult.schedule, virtualUrl, batchId };
}

function presentErrors(errors: ScheduleFieldErrors): Record<string, string> {
  const presented: Record<string, string> = {};
  for (const [field, message] of Object.entries(errors)) {
    if (message) {
      presented[field] = message;
    }
  }
  return presented;
}

async function generateUniqueSlug(title: string): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = buildEventSlug(title, randomBytes(4).toString("hex"));
    const existing = await db.event.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
      return slug;
    }
  }
  log("error", "event.slug_generation_failed", { attempts: MAX_SLUG_ATTEMPTS });
  return null;
}

async function notifyRegistrantsOfCancellation(tx: Prisma.TransactionClient, eventId: string): Promise<void> {
  const event = await tx.event.findUniqueOrThrow({
    where: { id: eventId },
    select: { title: true, slug: true },
  });
  const registrations = await tx.eventRegistration.findMany({
    where: { eventId, status: { in: ["GOING", "WAITLISTED"] } },
    select: { userId: true },
  });
  for (const registration of registrations) {
    await createNotification(tx, {
      userId: registration.userId,
      kind: "EVENT",
      title: "Event cancelled",
      body: `${event.title} has been cancelled.`,
      linkPath: `${ROUTES.appEvents}/${event.slug}`,
    });
  }
}
