/**
 * Message body and send-rate rules. Pure: callers pass text that has already been through cleanText.
 */

export const MESSAGE_BODY_MAX_LENGTH = 2000;

/** At most this many messages per sender inside the rolling window, counted from the Message table. */
export const MESSAGE_RATE_LIMIT = 20;
export const MESSAGE_RATE_WINDOW_MS = 10 * 60 * 1000;

export const MESSAGE_PAGE_SIZE = 30;
export const MESSAGE_NEWER_BATCH_SIZE = 50;
export const MESSAGE_POLL_INTERVAL_MS = 15_000;

export type MessageBodyProblem = "EMPTY" | "TOO_LONG";

/** Counts code points, which is how Postgres counts VARCHAR length, so a body that passes here always fits the column. */
export function countCharacters(value: string): number {
  return Array.from(value).length;
}

export function evaluateMessageBody(cleanedBody: string): { ok: true } | { ok: false; problem: MessageBodyProblem } {
  if (cleanedBody.trim().length === 0) {
    return { ok: false, problem: "EMPTY" };
  }
  if (countCharacters(cleanedBody) > MESSAGE_BODY_MAX_LENGTH) {
    return { ok: false, problem: "TOO_LONG" };
  }
  return { ok: true };
}

export function messageRateWindowStart(now: Date): Date {
  return new Date(now.getTime() - MESSAGE_RATE_WINDOW_MS);
}

export interface MessageRateDecision {
  allowed: boolean;
  remaining: number;
}

/** `sentInWindow` counts messages this sender created since `messageRateWindowStart(now)`. */
export function evaluateMessageRate(sentInWindow: number): MessageRateDecision {
  const sent = Math.max(0, sentInWindow);
  return {
    allowed: sent < MESSAGE_RATE_LIMIT,
    remaining: Math.max(0, MESSAGE_RATE_LIMIT - sent),
  };
}
