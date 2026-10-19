import { z } from "zod";

import { cleanText, cleanSingleLine } from "@/lib/security/text";

import { MentorshipError } from "../domain/mentorship-errors";
import {
  MENTOR_CAPACITY_MAX,
  MENTOR_CAPACITY_MIN,
  MENTOR_LANGUAGE_LIMIT,
  MENTOR_TAG_MAX_LENGTH,
  MENTOR_TOPIC_LIMIT,
  PREFERRED_FORMATS,
  normalizeTopic,
  parseTagList,
  type PreferredFormat,
} from "../domain/mentorship-rules";

function topicsValid(raw: string): boolean {
  const topics = parseTagList(raw, normalizeTopic);
  return (
    topics.length > 0 &&
    topics.length <= MENTOR_TOPIC_LIMIT &&
    topics.every((topic) => topic.length <= MENTOR_TAG_MAX_LENGTH)
  );
}

function languagesValid(raw: string): boolean {
  const languages = parseTagList(raw);
  return (
    languages.length <= MENTOR_LANGUAGE_LIMIT &&
    languages.every((language) => language.length <= MENTOR_TAG_MAX_LENGTH)
  );
}

export const mentorProfileSchema = z.object({
  expertise: z
    .string()
    .trim()
    .min(10, "Describe your expertise in at least 10 characters.")
    .max(600, "Use 600 characters or fewer."),
  topics: z
    .string()
    .trim()
    .max(400, "Use 400 characters or fewer.")
    .refine(
      topicsValid,
      `Add between 1 and ${MENTOR_TOPIC_LIMIT} topics, each up to ${MENTOR_TAG_MAX_LENGTH} characters.`,
    ),
  languages: z
    .string()
    .trim()
    .max(300, "Use 300 characters or fewer.")
    .refine(
      languagesValid,
      `Add up to ${MENTOR_LANGUAGE_LIMIT} languages, each up to ${MENTOR_TAG_MAX_LENGTH} characters.`,
    ),
  availability: z
    .string()
    .trim()
    .min(3, "Describe when you are available.")
    .max(300, "Use 300 characters or fewer."),
  capacity: z
    .number({
      error: `Enter a whole number from ${MENTOR_CAPACITY_MIN} to ${MENTOR_CAPACITY_MAX}.`,
    })
    .int(
      `Enter a whole number from ${MENTOR_CAPACITY_MIN} to ${MENTOR_CAPACITY_MAX}.`,
    )
    .min(
      MENTOR_CAPACITY_MIN,
      `Capacity must be at least ${MENTOR_CAPACITY_MIN}.`,
    )
    .max(
      MENTOR_CAPACITY_MAX,
      `Capacity cannot be more than ${MENTOR_CAPACITY_MAX}.`,
    ),
  isActive: z.boolean(),
});

/** Form values for the mentor profile. Topics and languages are comma-separated text. */
export type MentorProfileFormInput = z.input<typeof mentorProfileSchema>;

export const mentorshipRequestSchema = z.object({
  mentorProfileId: z.string().min(1).max(64),
  goal: z
    .string()
    .trim()
    .min(1, "Describe what you hope to achieve.")
    .max(800, "Use 800 characters or fewer."),
  preferredFormat: z.enum(PREFERRED_FORMATS, {
    error: "Choose a preferred format.",
  }),
});
export type MentorshipRequestFormInput = z.input<
  typeof mentorshipRequestSchema
>;

export interface ParsedMentorProfile {
  expertise: string;
  topics: string[];
  languages: string[];
  availability: string;
  capacity: number;
  isActive: boolean;
}

function parseOrThrow<Output>(
  schema: z.ZodType<Output>,
  input: unknown,
): Output {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new MentorshipError(
      parsed.error.issues[0]?.message ?? "Check the highlighted fields.",
    );
  }
  return parsed.data;
}

export function parseMentorProfile(input: unknown): ParsedMentorProfile {
  const data = parseOrThrow(mentorProfileSchema, input);
  return {
    expertise: cleanText(data.expertise),
    topics: parseTagList(data.topics, normalizeTopic),
    languages: parseTagList(data.languages),
    availability: cleanSingleLine(data.availability),
    capacity: data.capacity,
    isActive: data.isActive,
  };
}

export function parseMentorshipRequest(input: unknown): {
  mentorProfileId: string;
  goal: string;
  preferredFormat: PreferredFormat;
} {
  const data = parseOrThrow(mentorshipRequestSchema, input);
  return {
    mentorProfileId: data.mentorProfileId,
    goal: cleanText(data.goal),
    preferredFormat: data.preferredFormat,
  };
}

export interface MentorSearchQuery {
  topic: string | null;
  q: string | null;
  page: number;
}

export function parseMentorSearchQuery(
  raw: Record<string, string | string[] | undefined>,
): MentorSearchQuery {
  const topic = normalizeTopic(firstValue(raw.topic) ?? "").slice(
    0,
    MENTOR_TAG_MAX_LENGTH,
  );
  const q = cleanSingleLine(firstValue(raw.q) ?? "").slice(0, 100);
  const page = Number.parseInt(firstValue(raw.page) ?? "1", 10);
  return {
    topic: topic || null,
    q: q || null,
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 500) : 1,
  };
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
