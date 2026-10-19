import { describe, expect, it } from "vitest";

import {
  canTransitionOpportunity,
  canViewOpportunity,
  deadlineFromDateInput,
  isDeadlineInFuture,
  isOpportunityLive,
  parseApplicationUrl,
  type OpportunityLifecycle,
} from "./opportunity-rules";

const NOW = new Date("2026-10-19T06:00:00Z");
const FUTURE = new Date("2026-11-01T00:00:00Z");
const PAST = new Date("2026-10-01T00:00:00Z");

function opportunity(
  overrides: Partial<OpportunityLifecycle> = {},
): OpportunityLifecycle {
  return {
    status: "PUBLISHED",
    deadline: FUTURE,
    postedById: "poster-1",
    ...overrides,
  };
}

describe("isOpportunityLive", () => {
  it("shows published items whose deadline is in the future", () => {
    expect(isOpportunityLive(opportunity(), NOW)).toBe(true);
  });

  it("shows published items without a deadline", () => {
    expect(isOpportunityLive(opportunity({ deadline: null }), NOW)).toBe(true);
  });

  it("hides published items whose deadline has passed", () => {
    expect(isOpportunityLive(opportunity({ deadline: PAST }), NOW)).toBe(false);
  });

  it("treats a deadline equal to now as expired", () => {
    expect(isOpportunityLive(opportunity({ deadline: NOW }), NOW)).toBe(false);
  });

  it.each(["DRAFT", "PENDING_REVIEW", "REJECTED", "CLOSED"] as const)(
    "hides %s items",
    (status) => {
      expect(isOpportunityLive(opportunity({ status }), NOW)).toBe(false);
    },
  );
});

describe("canViewOpportunity", () => {
  it("lets any member see a live item", () => {
    expect(canViewOpportunity(opportunity(), "someone-else", NOW)).toBe(true);
  });

  it("lets the poster see their own pending or rejected item", () => {
    expect(
      canViewOpportunity(
        opportunity({ status: "PENDING_REVIEW" }),
        "poster-1",
        NOW,
      ),
    ).toBe(true);
    expect(
      canViewOpportunity(opportunity({ status: "REJECTED" }), "poster-1", NOW),
    ).toBe(true);
  });

  it("hides pending, rejected and expired items from other members", () => {
    expect(
      canViewOpportunity(
        opportunity({ status: "PENDING_REVIEW" }),
        "someone-else",
        NOW,
      ),
    ).toBe(false);
    expect(
      canViewOpportunity(
        opportunity({ status: "REJECTED" }),
        "someone-else",
        NOW,
      ),
    ).toBe(false);
    expect(
      canViewOpportunity(opportunity({ deadline: PAST }), "someone-else", NOW),
    ).toBe(false);
  });
});

describe("canTransitionOpportunity", () => {
  it("allows staff decisions only from pending review", () => {
    expect(canTransitionOpportunity("PENDING_REVIEW", "PUBLISHED")).toBe(true);
    expect(canTransitionOpportunity("PENDING_REVIEW", "REJECTED")).toBe(true);
    expect(canTransitionOpportunity("REJECTED", "PUBLISHED")).toBe(false);
    expect(canTransitionOpportunity("PUBLISHED", "REJECTED")).toBe(false);
  });

  it("allows only expiry from published", () => {
    expect(canTransitionOpportunity("PUBLISHED", "CLOSED")).toBe(true);
    expect(canTransitionOpportunity("CLOSED", "PUBLISHED")).toBe(false);
  });
});

describe("isDeadlineInFuture", () => {
  it("requires the deadline to be strictly after now", () => {
    expect(isDeadlineInFuture(FUTURE, NOW)).toBe(true);
    expect(isDeadlineInFuture(NOW, NOW)).toBe(false);
    expect(isDeadlineInFuture(PAST, NOW)).toBe(false);
  });
});

describe("deadlineFromDateInput", () => {
  it("returns the end of the named day in Karachi time", () => {
    const deadline = deadlineFromDateInput("2026-11-30");
    expect(deadline?.toISOString()).toBe("2026-11-30T18:59:59.999Z");
  });

  it("rejects malformed and non-existent dates", () => {
    expect(deadlineFromDateInput("30/11/2026")).toBeNull();
    expect(deadlineFromDateInput("2026-02-30")).toBeNull();
    expect(deadlineFromDateInput("")).toBeNull();
  });
});

describe("parseApplicationUrl", () => {
  it("accepts an https link and returns the normalized form", () => {
    expect(parseApplicationUrl("  https://example.com/apply  ")).toEqual({
      ok: true,
      url: "https://example.com/apply",
    });
  });

  it("rejects plain http links", () => {
    const result = parseApplicationUrl("http://example.com/apply");
    expect(result).toEqual({
      ok: false,
      message: "The application link must start with https://.",
    });
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com/file",
    "https://user:secret@example.com/apply",
    "example.com/apply",
    "https://exa mple.com",
    "",
    "   ",
  ])("rejects unsafe or malformed value %j", (value) => {
    expect(parseApplicationUrl(value).ok).toBe(false);
  });

  it("rejects links longer than 500 characters", () => {
    const longPath = "a".repeat(500);
    expect(parseApplicationUrl(`https://example.com/${longPath}`).ok).toBe(
      false,
    );
  });
});
