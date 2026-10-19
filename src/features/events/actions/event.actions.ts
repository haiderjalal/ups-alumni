"use server";

import { getStaffRoles, requireActiveMember } from "@/lib/session";
import { actionError, type ActionResult } from "@/types/action";

import { setEventAttendance } from "../services/event-attendance.service";
import { cancelEventRsvp, rsvpToEvent, type RsvpOutcome } from "../services/event-rsvp.service";
import { loadEventViewer } from "../services/event-viewer.service";
import { eventAttendanceSchema, eventRsvpSchema } from "../validation/event.schema";

const EVENT_UNAVAILABLE = "This event is not available.";

export async function rsvpToEventAction(input: { slug: string }): Promise<ActionResult<RsvpOutcome>> {
  const user = await requireActiveMember();
  const parsed = eventRsvpSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(EVENT_UNAVAILABLE);
  }
  const viewer = await loadEventViewer(user.id);
  return rsvpToEvent({ slug: parsed.data.slug, viewer });
}

export async function cancelEventRsvpAction(input: { slug: string }): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = eventRsvpSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(EVENT_UNAVAILABLE);
  }
  return cancelEventRsvp({ slug: parsed.data.slug, userId: user.id });
}

export async function setEventAttendanceAction(input: {
  eventId: string;
  attendeeUserId: string;
  attended: boolean;
}): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = eventAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Choose a valid attendance update.");
  }
  const roles = await getStaffRoles(user.id);
  return setEventAttendance({
    eventId: parsed.data.eventId,
    attendeeUserId: parsed.data.attendeeUserId,
    attended: parsed.data.attended,
    actor: { userId: user.id, roles },
  });
}
