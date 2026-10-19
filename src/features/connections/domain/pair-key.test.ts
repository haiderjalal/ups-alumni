import { describe, expect, it } from "vitest";

import { createPairKey, otherMemberFromPairKey, orderPair } from "./pair-key";

describe("createPairKey", () => {
  it("produces the same key regardless of argument order", () => {
    expect(createPairKey("member-b", "member-a")).toBe("member-a:member-b");
    expect(createPairKey("member-a", "member-b")).toBe("member-a:member-b");
  });

  it("throws for a self-pair so callers cannot store one", () => {
    expect(() => createPairKey("same", "same")).toThrow();
  });
});

describe("orderPair", () => {
  it("places the lexically smaller id in low", () => {
    expect(orderPair("c2", "c1")).toEqual({ low: "c1", high: "c2" });
    expect(orderPair("c1", "c2")).toEqual({ low: "c1", high: "c2" });
  });
});

describe("otherMemberFromPairKey", () => {
  it("returns the counterpart for either member", () => {
    expect(otherMemberFromPairKey("a:b", "a")).toBe("b");
    expect(otherMemberFromPairKey("a:b", "b")).toBe("a");
  });

  it("returns null for a user outside the pair", () => {
    expect(otherMemberFromPairKey("a:b", "c")).toBeNull();
  });

  it("returns null for malformed keys", () => {
    expect(otherMemberFromPairKey("a", "a")).toBeNull();
    expect(otherMemberFromPairKey("a:b:c", "a")).toBeNull();
    expect(otherMemberFromPairKey("", "a")).toBeNull();
  });
});
