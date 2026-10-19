import { describe, expect, it } from "vitest";

import { canEditOwnContent, canPinPost, canRemoveContent } from "./feed-content-rules";

const AUTHOR = "author-1";
const OTHER = "member-2";
const MODERATOR: { userId: string; isGroupModerator: boolean } = { userId: OTHER, isGroupModerator: true };
const PLAIN_MEMBER: { userId: string; isGroupModerator: boolean } = { userId: OTHER, isGroupModerator: false };

describe("canEditOwnContent", () => {
  it("lets authors edit visible content only", () => {
    expect(canEditOwnContent({ authorId: AUTHOR, status: "VISIBLE" }, AUTHOR)).toBe(true);
    expect(canEditOwnContent({ authorId: AUTHOR, status: "REMOVED" }, AUTHOR)).toBe(false);
    expect(canEditOwnContent({ authorId: AUTHOR, status: "HIDDEN" }, AUTHOR)).toBe(false);
  });

  it("does not let anyone else edit", () => {
    expect(canEditOwnContent({ authorId: AUTHOR, status: "VISIBLE" }, OTHER)).toBe(false);
  });
});

describe("canRemoveContent", () => {
  it("lets authors and group moderators remove visible content", () => {
    expect(canRemoveContent({ authorId: AUTHOR, status: "VISIBLE" }, { userId: AUTHOR, isGroupModerator: false })).toBe(
      true,
    );
    expect(canRemoveContent({ authorId: AUTHOR, status: "VISIBLE" }, MODERATOR)).toBe(true);
  });

  it("refuses ordinary members and already removed content", () => {
    expect(canRemoveContent({ authorId: AUTHOR, status: "VISIBLE" }, PLAIN_MEMBER)).toBe(false);
    expect(canRemoveContent({ authorId: AUTHOR, status: "REMOVED" }, { userId: AUTHOR, isGroupModerator: false })).toBe(
      false,
    );
  });
});

describe("canPinPost", () => {
  it("lets a group moderator pin a group post", () => {
    expect(canPinPost({ groupId: "group-1" }, MODERATOR)).toBe(true);
  });

  it("never pins global posts, even for a moderator of some other group", () => {
    expect(canPinPost({ groupId: null }, MODERATOR)).toBe(false);
  });

  it("refuses ordinary members", () => {
    expect(canPinPost({ groupId: "group-1" }, PLAIN_MEMBER)).toBe(false);
  });
});
