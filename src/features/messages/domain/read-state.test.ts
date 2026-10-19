import { describe, expect, it } from "vitest";

import { isConversationUnread } from "./read-state";

const T1 = new Date("2026-10-19T10:00:00.000Z");
const T2 = new Date("2026-10-19T10:05:00.000Z");

describe("isConversationUnread", () => {
  it("is not unread when there are no messages", () => {
    expect(isConversationUnread({ viewerId: "alice", lastReadAt: null, latest: null })).toBe(false);
  });

  it("is unread when the other member wrote the newest message and the viewer never read", () => {
    expect(
      isConversationUnread({ viewerId: "alice", lastReadAt: null, latest: { senderId: "bob", createdAt: T1 } }),
    ).toBe(true);
  });

  it("is not unread when the viewer wrote the newest message", () => {
    expect(
      isConversationUnread({ viewerId: "alice", lastReadAt: null, latest: { senderId: "alice", createdAt: T2 } }),
    ).toBe(false);
  });

  it("compares the newest message with lastReadAt", () => {
    const latest = { senderId: "bob", createdAt: T2 };
    expect(isConversationUnread({ viewerId: "alice", lastReadAt: T1, latest })).toBe(true);
    expect(isConversationUnread({ viewerId: "alice", lastReadAt: T2, latest })).toBe(false);
  });
});
