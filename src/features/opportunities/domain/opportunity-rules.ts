/**
 * Opportunity visibility, lifecycle and link rules. Pure functions only (no database, framework or
 * server-only imports) so that they can be tested in isolation.
 */
import { toSafeHttpUrl } from "../../../lib/security/text";

export type OpportunityStatus =
  "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "CLOSED";

export interface OpportunityLifecycle {
  status: OpportunityStatus;
  deadline: Date | null;
  postedById: string;
}

export type ApplicationUrlResult =
  { ok: true; url: string } | { ok: false; message: string };

export const APPLICATION_URL_MAX_LENGTH = 500;

/** Karachi observes no daylight saving time, so a fixed +05:00 offset is exact for deadlines. */
const DEADLINE_UTC_OFFSET = "+05:00";
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const OPPORTUNITY_TRANSITIONS: Readonly<
  Record<OpportunityStatus, readonly OpportunityStatus[]>
> = {
  DRAFT: [],
  PENDING_REVIEW: ["PUBLISHED", "REJECTED"],
  PUBLISHED: ["CLOSED"],
  REJECTED: [],
  CLOSED: [],
};

export function canTransitionOpportunity(
  from: OpportunityStatus,
  to: OpportunityStatus,
): boolean {
  return OPPORTUNITY_TRANSITIONS[from].includes(to);
}

/** Published and not past its deadline. Expired or unpublished items never appear in listings. */
export function isOpportunityLive(
  input: Pick<OpportunityLifecycle, "status" | "deadline">,
  now: Date,
): boolean {
  if (input.status !== "PUBLISHED") {
    return false;
  }
  return input.deadline === null || input.deadline.getTime() > now.getTime();
}

/** Live items are visible to every active member. Other items are visible only to the member who posted them. */
export function canViewOpportunity(
  input: OpportunityLifecycle,
  viewerId: string,
  now: Date,
): boolean {
  return isOpportunityLive(input, now) || input.postedById === viewerId;
}

export function isDeadlineInFuture(deadline: Date, now: Date): boolean {
  return deadline.getTime() > now.getTime();
}

/**
 * Converts a calendar date (YYYY-MM-DD, as sent by a date input) into the end of that day in Karachi.
 * Returns null for malformed dates and dates that do not exist, such as 2026-02-30.
 */
export function deadlineFromDateInput(value: string): Date | null {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  const date = new Date(
    `${match[1]}-${match[2]}-${match[3]}T23:59:59.999${DEADLINE_UTC_OFFSET}`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Applications go to an external https page. Anything else (http, javascript:, data:, credentials in the
 * URL, malformed text) is rejected so that members are never sent to an unsafe destination.
 */
export function parseApplicationUrl(value: string): ApplicationUrlResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, message: "Enter the application link." };
  }
  if (trimmed.length > APPLICATION_URL_MAX_LENGTH) {
    return {
      ok: false,
      message: `Use ${APPLICATION_URL_MAX_LENGTH} characters or fewer.`,
    };
  }
  const safeUrl = toSafeHttpUrl(trimmed);
  if (!safeUrl) {
    return {
      ok: false,
      message: "Enter a valid web address starting with https://.",
    };
  }
  if (new URL(safeUrl).protocol !== "https:") {
    return {
      ok: false,
      message: "The application link must start with https://.",
    };
  }
  return { ok: true, url: safeUrl };
}
