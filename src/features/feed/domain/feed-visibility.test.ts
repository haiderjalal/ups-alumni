import { describe, expect, it } from "vitest";

import { canParticipate, canViewFeed, canViewPost, type FeedScope, type FeedViewer } from "./feed-visibility";

const GLOBAL: FeedScope = { kind: "GLOBAL" };
const PUBLIC_GROUP: FeedScope = { kind: "GROUP", isPrivate: false };
const PRIVATE_GROUP: FeedScope = { kind: "GROUP", isPrivate: true };

const ACTIVE_NON_MEMBER: FeedViewer = { isActiveMember: true, isActiveGroupMember: false };
const ACTIVE_GROUP_MEMBER: FeedViewer = { isActiveMember: true, isActiveGroupMember: true };
const SUSPENDED_GROUP_MEMBER: FeedViewer = { isActiveMember: false, isActiveGroupMember: true };

describe("canViewFeed", () => {
  it("shows the global feed to every active member", () => {
    expect(canViewFeed(GLOBAL, ACTIVE_NON_MEMBER)).toBe(true);
  });

  it("hides every feed from members who are not ACTIVE", () => {
    expect(canViewFeed(GLOBAL, { isActiveMember: false, isActiveGroupMember: false })).toBe(false);
    expect(canViewFeed(PUBLIC_GROUP, SUSPENDED_GROUP_MEMBER)).toBe(false);
    expect(canViewFeed(PRIVATE_GROUP, SUSPENDED_GROUP_MEMBER)).toBe(false);
  });

  it("shows a public group feed to every active member", () => {
    expect(canViewFeed(PUBLIC_GROUP, ACTIVE_NON_MEMBER)).toBe(true);
    expect(canViewFeed(PUBLIC_GROUP, ACTIVE_GROUP_MEMBER)).toBe(true);
  });

  it("hides a private group feed from non-members", () => {
    expect(canViewFeed(PRIVATE_GROUP, ACTIVE_NON_MEMBER)).toBe(false);
  });

  it("shows a private group feed to ACTIVE group members", () => {
    expect(canViewFeed(PRIVATE_GROUP, ACTIVE_GROUP_MEMBER)).toBe(true);
  });
});

describe("canParticipate", () => {
  it("lets any active member post in the global feed", () => {
    expect(canParticipate(GLOBAL, ACTIVE_NON_MEMBER)).toBe(true);
  });

  it("requires ACTIVE group membership to post in a group, even a public one", () => {
    expect(canParticipate(PUBLIC_GROUP, ACTIVE_NON_MEMBER)).toBe(false);
    expect(canParticipate(PUBLIC_GROUP, ACTIVE_GROUP_MEMBER)).toBe(true);
  });

  it("refuses participation from members who are not ACTIVE", () => {
    expect(canParticipate(GLOBAL, { isActiveMember: false, isActiveGroupMember: false })).toBe(false);
    expect(canParticipate(PRIVATE_GROUP, SUSPENDED_GROUP_MEMBER)).toBe(false);
  });
});

describe("canViewPost", () => {
  it("hides content from a member who blocks the author or is blocked by them", () => {
    expect(canViewPost(GLOBAL, ACTIVE_GROUP_MEMBER, true)).toBe(false);
  });

  it("applies the feed rule when no block exists", () => {
    expect(canViewPost(PRIVATE_GROUP, ACTIVE_NON_MEMBER, false)).toBe(false);
    expect(canViewPost(PRIVATE_GROUP, ACTIVE_GROUP_MEMBER, false)).toBe(true);
  });
});
