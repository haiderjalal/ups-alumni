import { describe, expect, it } from "vitest";

import {
  canEndMentorship,
  canRequestMentor,
  canRespondToRequest,
  canTransitionMentorship,
  canTransitionMentorshipRequest,
  canWithdrawRequest,
  evaluateMentorCapacity,
  isValidMentorCapacity,
  normalizeTopic,
  parseTagList,
  type MentorshipRequestState,
  type MentorshipState,
} from "./mentorship-rules";

describe("mentorship request transitions", () => {
  it.each<[MentorshipRequestState, MentorshipRequestState, boolean]>([
    ["PENDING", "ACCEPTED", true],
    ["PENDING", "DECLINED", true],
    ["PENDING", "WITHDRAWN", true],
    ["ACCEPTED", "PENDING", false],
    ["ACCEPTED", "DECLINED", false],
    ["DECLINED", "ACCEPTED", false],
    ["WITHDRAWN", "PENDING", false],
  ])("%s to %s is allowed: %s", (from, to, expected) => {
    expect(canTransitionMentorshipRequest(from, to)).toBe(expected);
  });
});

describe("mentorship transitions", () => {
  it.each<[MentorshipState, MentorshipState, boolean]>([
    ["ACTIVE", "COMPLETED", true],
    ["ACTIVE", "CANCELLED", true],
    ["COMPLETED", "ACTIVE", false],
    ["CANCELLED", "COMPLETED", false],
    ["COMPLETED", "CANCELLED", false],
  ])("%s to %s is allowed: %s", (from, to, expected) => {
    expect(canTransitionMentorship(from, to)).toBe(expected);
  });
});

describe("mentor capacity", () => {
  it("allows a new mentee while active mentorships are below capacity", () => {
    expect(evaluateMentorCapacity({ capacity: 3, activeCount: 2 })).toEqual({
      allowed: true,
      remaining: 1,
    });
  });

  it("refuses a new mentee at capacity", () => {
    expect(evaluateMentorCapacity({ capacity: 2, activeCount: 2 })).toEqual({
      allowed: false,
      remaining: 0,
    });
  });

  it("never reports negative remaining capacity", () => {
    expect(evaluateMentorCapacity({ capacity: 1, activeCount: 4 })).toEqual({
      allowed: false,
      remaining: 0,
    });
  });

  it("accepts whole numbers from 1 to 10 only", () => {
    expect(isValidMentorCapacity(1)).toBe(true);
    expect(isValidMentorCapacity(10)).toBe(true);
    expect(isValidMentorCapacity(0)).toBe(false);
    expect(isValidMentorCapacity(11)).toBe(false);
    expect(isValidMentorCapacity(2.5)).toBe(false);
    expect(isValidMentorCapacity(Number.NaN)).toBe(false);
  });
});

describe("mentorship authorization rules", () => {
  it("does not let a member request mentorship from themselves", () => {
    expect(
      canRequestMentor({
        requesterId: "u1",
        mentorUserId: "u1",
        mentorIsActive: true,
      }),
    ).toBe(false);
  });

  it("does not allow requests to inactive mentor profiles", () => {
    expect(
      canRequestMentor({
        requesterId: "u2",
        mentorUserId: "u1",
        mentorIsActive: false,
      }),
    ).toBe(false);
    expect(
      canRequestMentor({
        requesterId: "u2",
        mentorUserId: "u1",
        mentorIsActive: true,
      }),
    ).toBe(true);
  });

  it("only the mentor responds to a request and only the mentee withdraws it", () => {
    expect(canRespondToRequest("mentor", "mentor")).toBe(true);
    expect(canRespondToRequest("mentee", "mentor")).toBe(false);
    expect(canWithdrawRequest("mentee", "mentee")).toBe(true);
    expect(canWithdrawRequest("mentor", "mentee")).toBe(false);
  });

  it("lets either party end a mentorship and nobody else", () => {
    const pair = { mentorId: "mentor", menteeId: "mentee" };
    expect(canEndMentorship("mentor", pair)).toBe(true);
    expect(canEndMentorship("mentee", pair)).toBe(true);
    expect(canEndMentorship("stranger", pair)).toBe(false);
  });
});

describe("parseTagList", () => {
  it("splits on commas and new lines and trims entries", () => {
    expect(parseTagList(" Finance ,\nCivil  engineering , ")).toEqual([
      "Finance",
      "Civil engineering",
    ]);
  });

  it("removes duplicates case-insensitively, keeping the first spelling", () => {
    expect(parseTagList("Urdu, urdu, English")).toEqual(["Urdu", "English"]);
  });

  it("lowercases topics through normalizeTopic so that search matches stored values", () => {
    expect(
      parseTagList("Career Coaching, career coaching", normalizeTopic),
    ).toEqual(["career coaching"]);
  });

  it("returns an empty list for blank input", () => {
    expect(parseTagList(" , \n ")).toEqual([]);
  });
});
