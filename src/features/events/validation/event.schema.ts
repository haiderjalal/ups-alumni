import { z } from "zod";

import { cleanSingleLine, cleanText, toSafeHttpUrl } from "@/lib/security/text";

import { isValidTimeZone } from "../domain/zoned-time";

const identifier = z.string().min(1).max(64);

/** datetime-local values: "YYYY-MM-DDTHH:mm", optionally with seconds. Converted to UTC by the service. */
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Enter a valid date and time.");

const optionalLocalDateTime = z
  .union([z.literal(""), localDateTime])
  .nullable()
  .transform((value) => (value ? value : null));

const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .max(maxLength, message)
    .nullable()
    .transform((value) => {
      const cleaned = value ? cleanSingleLine(value) : "";
      return cleaned.length > 0 ? cleaned : null;
    });

/** Fields shared by create and update. Times stay as local wall-clock text until the schedule is resolved. */
export const eventFieldsShape = {
  title: z
    .string()
    .transform(cleanSingleLine)
    .pipe(z.string().min(3, "Title needs at least 3 characters.").max(160, "Title can be up to 160 characters.")),
  description: z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(1, "Add a description.").max(4000, "Description can be up to 4000 characters.")),
  startsAtLocal: localDateTime,
  endsAtLocal: optionalLocalDateTime,
  rsvpDeadlineLocal: optionalLocalDateTime,
  timezone: z.string().min(1).max(64).refine(isValidTimeZone, "Choose a valid time zone."),
  locationText: optionalText(200, "Location can be up to 200 characters."),
  virtualUrl: z
    .string()
    .max(500, "Link can be up to 500 characters.")
    .nullable()
    .refine((value) => !value || toSafeHttpUrl(value) !== null, "Enter a valid http or https link.")
    .transform((value) => (value ? value.trim() : null)),
  visibility: z.enum(["PUBLIC", "MEMBERS", "BATCH"]),
  batchId: identifier.nullable(),
  capacity: z.number().int("Capacity must be a whole number.").min(1, "Capacity must be at least 1.").max(100000).nullable(),
};

export const createEventSchema = z.object({
  ...eventFieldsShape,
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export const updateEventSchema = z.object(eventFieldsShape);

export const setEventStatusSchema = z.object({
  eventId: identifier,
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]),
});

export const eventRsvpSchema = z.object({
  slug: z.string().min(1).max(120),
});

export const eventAttendanceSchema = z.object({
  eventId: identifier,
  attendeeUserId: identifier,
  attended: z.boolean(),
});

export type CreateEventFormValues = z.input<typeof createEventSchema>;
export type UpdateEventFormValues = z.input<typeof updateEventSchema>;
