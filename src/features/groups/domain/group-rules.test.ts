import { describe, expect, it } from "vitest";

import {
  canModerateMember,
  canViewGroup,
  nextStatusForLeave,
  nextStatusForModeration,
  resolveJoin,
} from "./group-rules";

describe("resolveJoin", () => {
  it("admits a member straight into an OPEN group", () => {
    expect(resolveJoin("OPEN", null)).toEqual({ kind: "SET_STATUS", status: "ACTIVE" });
  });

  it("holds a request as PENDING in a REQUEST group", () => {
    expect(resolveJoin("REQUEST", null)).toEqual({ kind: "SET_STATUS", status: "PENDING" });
  });

  it("starts over after a removal, under the group's policy", () => {
    expect(resolveJoin("REQUEST", "REMOVED")).toEqual({ kind: "SET_STATUS", status: "PENDING" });
    expect(resolveJoin("OPEN", "REMOVED")).toEqual({ kind: "SET_STATUS", status: "ACTIVE" });
  });

  it("does nothing for an existing member or a pending request", () => {
    expect(resolveJoin("OPEN", "ACTIVE")).toEqual({ kind: "ALREADY_MEMBER" });
    expect(resolveJoin("REQUEST", "PENDING")).toEqual({ kind: "ALREADY_REQUESTED" });
  });
});

describe("canViewGroup", () => {
  it("shows public groups to everyone", () => {
    expect(canViewGroup({ isPrivate: false }, null)).toBe(true);
    expect(canViewGroup({ isPrivate: false }, "REMOVED")).toBe(true);
  });

  it("shows private groups only to ACTIVE members", () => {
    expect(canViewGroup({ isPrivate: true }, "ACTIVE")).toBe(true);
    expect(canViewGroup({ isPrivate: true }, "PENDING")).toBe(false);
    expect(canViewGroup({ isPrivate: true }, null)).toBe(false);
  });
});

describe("nextStatusForModeration", () => {
  it("approves only pending requests", () => {
    expect(nextStatusForModeration("APPROVE", "PENDING")).toBe("ACTIVE");
    expect(nextStatusForModeration("APPROVE", "ACTIVE")).toBeNull();
    expect(nextStatusForModeration("APPROVE", "REMOVED")).toBeNull();
  });

  it("removes pending requests and active members only", () => {
    expect(nextStatusForModeration("REMOVE", "PENDING")).toBe("REMOVED");
    expect(nextStatusForModeration("REMOVE", "ACTIVE")).toBe("REMOVED");
    expect(nextStatusForModeration("REMOVE", "REMOVED")).toBeNull();
  });
});

describe("nextStatusForLeave", () => {
  it("ends an active membership or a pending request", () => {
    expect(nextStatusForLeave("ACTIVE")).toBe("REMOVED");
    expect(nextStatusForLeave("PENDING")).toBe("REMOVED");
    expect(nextStatusForLeave("REMOVED")).toBeNull();
  });
});

describe("canModerateMember", () => {
  it("refuses moderation of the moderator's own membership", () => {
    expect(canModerateMember("user-1", "user-1")).toBe(false);
    expect(canModerateMember("user-1", "user-2")).toBe(true);
  });
});
