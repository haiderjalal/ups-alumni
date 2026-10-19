import { describe, expect, it } from "vitest";

import {
  canManageEvent,
  canRegisterForEvent,
  canSeeVirtualLink,
  canViewEvent,
  isInAudience,
  type EventAccessTarget,
  type EventViewer,
} from "./event-visibility";

const ORGANIZER_ID = "organizer-1";
const BATCH_ID = "batch-2017";

function target(overrides: Partial<EventAccessTarget> = {}): EventAccessTarget {
  return {
    status: "PUBLISHED",
    visibility: "MEMBERS",
    batchId: null,
    organizerId: ORGANIZER_ID,
    ...overrides,
  };
}

function viewer(overrides: Partial<EventViewer> = {}): EventViewer {
  return { userId: "member-1", batchId: null, roles: [], ...overrides };
}

describe("canViewEvent", () => {
  it("shows a published MEMBERS event to any active member", () => {
    expect(canViewEvent(target({ visibility: "MEMBERS" }), viewer())).toBe(true);
  });

  it("shows a published PUBLIC event to an active member", () => {
    expect(canViewEvent(target({ visibility: "PUBLIC" }), viewer())).toBe(true);
  });

  it("shows a BATCH event only to members of the same matric batch", () => {
    const event = target({ visibility: "BATCH", batchId: BATCH_ID });
    expect(canViewEvent(event, viewer({ batchId: BATCH_ID }))).toBe(true);
    expect(canViewEvent(event, viewer({ batchId: "batch-2018" }))).toBe(false);
  });

  it("hides a BATCH event from members with no batch on record", () => {
    const event = target({ visibility: "BATCH", batchId: BATCH_ID });
    expect(canViewEvent(event, viewer({ batchId: null }))).toBe(false);
  });

  it("hides drafts and cancelled events from ordinary members", () => {
    expect(canViewEvent(target({ status: "DRAFT" }), viewer())).toBe(false);
    expect(canViewEvent(target({ status: "CANCELLED" }), viewer())).toBe(false);
  });

  it("lets the organizer see a draft", () => {
    expect(canViewEvent(target({ status: "DRAFT" }), viewer({ userId: ORGANIZER_ID }))).toBe(true);
  });

  it("lets a content moderator see a draft", () => {
    expect(canViewEvent(target({ status: "DRAFT" }), viewer({ roles: ["CONTENT_MODERATOR"] }))).toBe(true);
  });

  it("does not let other staff roles bypass audience or status", () => {
    const event = target({ status: "DRAFT", visibility: "BATCH", batchId: BATCH_ID });
    expect(canViewEvent(event, viewer({ roles: ["FINANCE_REVIEWER", "GROUP_REPRESENTATIVE"] }))).toBe(false);
  });
});

describe("canRegisterForEvent", () => {
  it("requires a published event that the audience admits", () => {
    expect(canRegisterForEvent(target(), viewer())).toBe(true);
    expect(canRegisterForEvent(target({ status: "DRAFT" }), viewer({ roles: ["CONTENT_MODERATOR"] }))).toBe(false);
    expect(canRegisterForEvent(target({ status: "CANCELLED" }), viewer())).toBe(false);
  });

  it("refuses a batch member registering for another batch", () => {
    expect(canRegisterForEvent(target({ visibility: "BATCH", batchId: BATCH_ID }), viewer({ batchId: "x" }))).toBe(
      false,
    );
  });
});

describe("isInAudience", () => {
  it("ignores status, which is checked separately", () => {
    expect(isInAudience(target({ status: "DRAFT" }), viewer())).toBe(true);
  });
});

describe("canManageEvent", () => {
  it("allows the organizer and content moderators only", () => {
    expect(canManageEvent(target(), viewer({ userId: ORGANIZER_ID }))).toBe(true);
    expect(canManageEvent(target(), viewer({ roles: ["CONTENT_MODERATOR"] }))).toBe(true);
    expect(canManageEvent(target(), viewer({ roles: ["SUPER_ADMIN"] }))).toBe(false);
    expect(canManageEvent(target(), viewer())).toBe(false);
  });
});

describe("canSeeVirtualLink", () => {
  it("shows the link to attendees and the organizer only", () => {
    expect(canSeeVirtualLink({ organizerId: ORGANIZER_ID }, { userId: "member-1" }, true)).toBe(true);
    expect(canSeeVirtualLink({ organizerId: ORGANIZER_ID }, { userId: "member-1" }, false)).toBe(false);
    expect(canSeeVirtualLink({ organizerId: ORGANIZER_ID }, { userId: ORGANIZER_ID }, false)).toBe(true);
  });
});
