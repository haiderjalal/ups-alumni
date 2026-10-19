/**
 * Mentorship request and relationship rules. Pure functions only (no database, framework or server-only
 * imports) so that every state transition and capacity decision can be tested in isolation.
 */

export type MentorshipRequestState =
  "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN";
export type MentorshipState = "ACTIVE" | "COMPLETED" | "CANCELLED";

export const PREFERRED_FORMATS = ["ONLINE", "PHONE", "IN_PERSON"] as const;
export type PreferredFormat = (typeof PREFERRED_FORMATS)[number];

export const MENTOR_CAPACITY_MIN = 1;
export const MENTOR_CAPACITY_MAX = 10;
export const MENTOR_TOPIC_LIMIT = 8;
export const MENTOR_LANGUAGE_LIMIT = 6;
export const MENTOR_TAG_MAX_LENGTH = 40;

const REQUEST_TRANSITIONS: Readonly<
  Record<MentorshipRequestState, readonly MentorshipRequestState[]>
> = {
  PENDING: ["ACCEPTED", "DECLINED", "WITHDRAWN"],
  ACCEPTED: [],
  DECLINED: [],
  WITHDRAWN: [],
};

const MENTORSHIP_TRANSITIONS: Readonly<
  Record<MentorshipState, readonly MentorshipState[]>
> = {
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export interface CapacityDecision {
  allowed: boolean;
  remaining: number;
}

export function canTransitionMentorshipRequest(
  from: MentorshipRequestState,
  to: MentorshipRequestState,
): boolean {
  return REQUEST_TRANSITIONS[from].includes(to);
}

export function canTransitionMentorship(
  from: MentorshipState,
  to: MentorshipState,
): boolean {
  return MENTORSHIP_TRANSITIONS[from].includes(to);
}

export function isValidMentorCapacity(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MENTOR_CAPACITY_MIN &&
    value <= MENTOR_CAPACITY_MAX
  );
}

/** A mentor can take a new mentee only while active mentorships are below capacity. */
export function evaluateMentorCapacity(input: {
  capacity: number;
  activeCount: number;
}): CapacityDecision {
  const remaining = Math.max(0, input.capacity - input.activeCount);
  return { allowed: remaining > 0, remaining };
}

export function canRequestMentor(input: {
  requesterId: string;
  mentorUserId: string;
  mentorIsActive: boolean;
}): boolean {
  return input.mentorIsActive && input.requesterId !== input.mentorUserId;
}

export function canRespondToRequest(
  actorId: string,
  mentorUserId: string,
): boolean {
  return actorId === mentorUserId;
}

export function canWithdrawRequest(
  actorId: string,
  menteeUserId: string,
): boolean {
  return actorId === menteeUserId;
}

/** Either party may complete or cancel an active mentorship. */
export function canEndMentorship(
  actorId: string,
  pair: { mentorId: string; menteeId: string },
): boolean {
  return actorId === pair.mentorId || actorId === pair.menteeId;
}

export function normalizeTopic(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Splits a comma or line separated list, trims and collapses spaces, drops empty entries and removes
 * duplicates (case-insensitive). Topics pass normalizeTopic so that search matches stored values.
 */
export function parseTagList(
  raw: string,
  normalize: (value: string) => string = (value) =>
    value.trim().replace(/\s+/g, " "),
): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const tag = normalize(part);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}
