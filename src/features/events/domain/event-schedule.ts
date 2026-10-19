import { zonedLocalToUtc } from "./zoned-time";

export interface ScheduleInput {
  /** Wall-clock values as entered, in the event's time zone. */
  startsAtLocal: string;
  endsAtLocal: string | null;
  rsvpDeadlineLocal: string | null;
  timezone: string;
}

export interface EventSchedule {
  startsAt: Date;
  endsAt: Date | null;
  rsvpDeadline: Date | null;
}

export type ScheduleFieldErrors = Partial<Record<keyof ScheduleInput, string>>;

export type ScheduleResult = { ok: true; schedule: EventSchedule } | { ok: false; fieldErrors: ScheduleFieldErrors };

/** Converts the entered times to UTC and checks that the end follows the start. */
export function resolveEventSchedule(input: ScheduleInput): ScheduleResult {
  const fieldErrors: ScheduleFieldErrors = {};

  const startsAt = zonedLocalToUtc(input.startsAtLocal, input.timezone);
  if (!startsAt) {
    fieldErrors.startsAtLocal = "Enter a valid start date and time.";
  }

  let endsAt: Date | null = null;
  if (input.endsAtLocal) {
    endsAt = zonedLocalToUtc(input.endsAtLocal, input.timezone);
    if (!endsAt) {
      fieldErrors.endsAtLocal = "Enter a valid end date and time.";
    } else if (startsAt && endsAt.getTime() <= startsAt.getTime()) {
      fieldErrors.endsAtLocal = "The end time must be after the start time.";
    }
  }

  let rsvpDeadline: Date | null = null;
  if (input.rsvpDeadlineLocal) {
    rsvpDeadline = zonedLocalToUtc(input.rsvpDeadlineLocal, input.timezone);
    if (!rsvpDeadline) {
      fieldErrors.rsvpDeadlineLocal = "Enter a valid RSVP deadline.";
    }
  }

  if (!startsAt || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, schedule: { startsAt, endsAt, rsvpDeadline } };
}
