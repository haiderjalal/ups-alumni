import { describe, expect, it } from "vitest";

import {
  MESSAGE_BODY_MAX_LENGTH,
  MESSAGE_RATE_LIMIT,
  MESSAGE_RATE_WINDOW_MS,
  countCharacters,
  evaluateMessageBody,
  evaluateMessageRate,
  messageRateWindowStart,
} from "./message-rules";

describe("evaluateMessageBody", () => {
  it("accepts a body between 1 and 2000 characters", () => {
    expect(evaluateMessageBody("Hello")).toEqual({ ok: true });
    expect(evaluateMessageBody("a".repeat(MESSAGE_BODY_MAX_LENGTH))).toEqual({ ok: true });
  });

  it("rejects an empty or whitespace-only body", () => {
    expect(evaluateMessageBody("")).toEqual({ ok: false, problem: "EMPTY" });
    expect(evaluateMessageBody("   \n ")).toEqual({ ok: false, problem: "EMPTY" });
  });

  it("rejects a body longer than 2000 characters", () => {
    expect(evaluateMessageBody("a".repeat(MESSAGE_BODY_MAX_LENGTH + 1))).toEqual({
      ok: false,
      problem: "TOO_LONG",
    });
  });

  it("counts an emoji as one character, matching the database column", () => {
    expect(countCharacters("😀😀")).toBe(2);
    expect(evaluateMessageBody("😀".repeat(MESSAGE_BODY_MAX_LENGTH))).toEqual({ ok: true });
    expect(evaluateMessageBody("😀".repeat(MESSAGE_BODY_MAX_LENGTH + 1))).toEqual({ ok: false, problem: "TOO_LONG" });
  });
});

describe("message rate window", () => {
  const now = new Date("2026-10-19T12:00:00.000Z");

  it("starts ten minutes before now", () => {
    expect(messageRateWindowStart(now).getTime()).toBe(now.getTime() - MESSAGE_RATE_WINDOW_MS);
    expect(MESSAGE_RATE_WINDOW_MS).toBe(10 * 60 * 1000);
  });

  it("allows sending while fewer than the limit were sent in the window", () => {
    expect(evaluateMessageRate(0)).toEqual({ allowed: true, remaining: MESSAGE_RATE_LIMIT });
    expect(evaluateMessageRate(MESSAGE_RATE_LIMIT - 1)).toEqual({ allowed: true, remaining: 1 });
  });

  it("blocks the message that would exceed the limit", () => {
    expect(evaluateMessageRate(MESSAGE_RATE_LIMIT)).toEqual({ allowed: false, remaining: 0 });
    expect(evaluateMessageRate(MESSAGE_RATE_LIMIT + 5)).toEqual({ allowed: false, remaining: 0 });
  });

  it("treats a negative count as zero", () => {
    expect(evaluateMessageRate(-3)).toEqual({ allowed: true, remaining: MESSAGE_RATE_LIMIT });
  });
});
