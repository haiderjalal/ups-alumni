"use server";

import { requireStaffRole } from "@/lib/session";
import type { ActionResult } from "@/types/action";

import type { EventPublicationStatus } from "../domain/event-visibility";
import { EVENT_ADMIN_ROLES, createEvent, setEventStatus, updateEvent } from "../services/event-admin.service";
import type { CreateEventFormValues, UpdateEventFormValues } from "../validation/event.schema";

export async function createEventAction(values: CreateEventFormValues): Promise<ActionResult<{ eventId: string; slug: string }>> {
  const user = await requireStaffRole(EVENT_ADMIN_ROLES);
  return createEvent({ actor: { userId: user.id, roles: user.roles }, values });
}

export async function updateEventAction(input: {
  eventId: string;
  values: UpdateEventFormValues;
}): Promise<ActionResult> {
  const user = await requireStaffRole(EVENT_ADMIN_ROLES);
  return updateEvent({ actor: { userId: user.id, roles: user.roles }, eventId: input.eventId, values: input.values });
}

export async function setEventStatusAction(input: {
  eventId: string;
  status: EventPublicationStatus;
}): Promise<ActionResult> {
  const user = await requireStaffRole(EVENT_ADMIN_ROLES);
  return setEventStatus({
    actor: { userId: user.id, roles: user.roles },
    eventId: input.eventId,
    status: input.status,
  });
}
