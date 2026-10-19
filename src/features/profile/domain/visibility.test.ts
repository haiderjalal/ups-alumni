import { describe, expect, it } from "vitest";

import { canViewContact, isDiscoverable, type ContactViewer } from "./visibility";

const OWNER = "owner-1";

function viewer(overrides: Partial<ContactViewer> = {}): ContactViewer {
  return {
    viewerId: "viewer-1",
    isActiveMember: true,
    isConnectedToOwner: false,
    isMembershipStaff: false,
    ...overrides,
  };
}

describe("canViewContact", () => {
  it("always lets the owner see their own details", () => {
    expect(canViewContact(OWNER, "PRIVATE", viewer({ viewerId: OWNER, isActiveMember: false }))).toBe(true);
  });

  it("keeps PRIVATE details from other members, even active ones", () => {
    expect(canViewContact(OWNER, "PRIVATE", viewer())).toBe(false);
  });

  it("shows CONNECTIONS details only to accepted connections", () => {
    expect(canViewContact(OWNER, "CONNECTIONS", viewer())).toBe(false);
    expect(canViewContact(OWNER, "CONNECTIONS", viewer({ isConnectedToOwner: true }))).toBe(true);
  });

  it("shows MEMBERS details to any active member, but not to people without membership", () => {
    expect(canViewContact(OWNER, "MEMBERS", viewer())).toBe(true);
    expect(canViewContact(OWNER, "MEMBERS", viewer({ isActiveMember: false }))).toBe(false);
  });

  it("never shows details to anonymous visitors, whatever the setting", () => {
    expect(canViewContact(OWNER, "MEMBERS", viewer({ viewerId: null }))).toBe(false);
  });

  it("lets membership staff verify details", () => {
    expect(canViewContact(OWNER, "PRIVATE", viewer({ isMembershipStaff: true }))).toBe(true);
  });
});

describe("isDiscoverable", () => {
  it("requires both the member's listing choice and an active membership", () => {
    expect(isDiscoverable({ directoryDiscoverable: true }, true)).toBe(true);
    expect(isDiscoverable({ directoryDiscoverable: false }, true)).toBe(false);
    expect(isDiscoverable({ directoryDiscoverable: true }, false)).toBe(false);
  });
});
