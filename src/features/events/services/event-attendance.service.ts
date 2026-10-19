import "server-only";

import { recordAudit } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";
import { actionError, actionOk, type ActionResult } from "@/types/action";
import type { StaffRole } from "@/generated/prisma/client";

import { canManageEvent } from "../domain/event-visibility";

export interface EventActor {
  userId: string;
  roles: readonly StaffRole[];
}

/** Records or clears attendance for a member who is going. Organizers and content moderators only. */
export async function setEventAttendance(input: {
  eventId: string;
  attendeeUserId: string;
  attended: boolean;
  actor: EventActor;
}): Promise<ActionResult> {
  const event = await db.event.findUnique({
    where: { id: input.eventId },
    select: { organizerId: true },
  });
  if (!event) {
    return actionError("This event is not available.");
  }
  if (!canManageEvent(event, input.actor)) {
    return actionError("Only the organizer or a content moderator can record attendance.");
  }

  return db.$transaction(async (tx): Promise<ActionResult> => {
    const updated = await tx.eventRegistration.updateMany({
      where: { eventId: input.eventId, userId: input.attendeeUserId, status: "GOING" },
      data: { attendedAt: input.attended ? new Date() : null },
    });
    if (updated.count !== 1) {
      return actionError("Only members who are going can be marked as attended.");
    }

    await recordAudit(tx, {
      action: "event.attendance.recorded",
      entityType: "event",
      entityId: input.eventId,
      actorId: input.actor.userId,
      actorRoles: input.actor.roles,
      metadata: { attendeeUserId: input.attendeeUserId, attended: input.attended },
    });
    return actionOk();
  });
}
