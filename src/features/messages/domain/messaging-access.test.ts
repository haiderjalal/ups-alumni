import { describe, expect, it } from "vitest";

import { evaluateMessagingAccess, type MessagingAccessFacts } from "./messaging-access";

const OPEN: MessagingAccessFacts = { viewerActive: true, otherActive: true, connected: true, blocked: false };

describe("evaluateMessagingAccess", () => {
  it("allows messaging between active, connected members with no block", () => {
    expect(evaluateMessagingAccess(OPEN)).toBeNull();
  });

  it("refuses when the viewer is not an active member", () => {
    expect(evaluateMessagingAccess({ ...OPEN, viewerActive: false })).toBe("VIEWER_INACTIVE");
  });

  it("refuses when the other member is suspended, pending or closed", () => {
    expect(evaluateMessagingAccess({ ...OPEN, otherActive: false })).toBe("MEMBER_UNAVAILABLE");
  });

  it("refuses when a block exists in either direction", () => {
    expect(evaluateMessagingAccess({ ...OPEN, blocked: true })).toBe("BLOCKED");
  });

  it("refuses without an accepted connection", () => {
    expect(evaluateMessagingAccess({ ...OPEN, connected: false })).toBe("NOT_CONNECTED");
  });
});
