import { describe, expect, it } from "vitest";

import { canTransitionEventStatus } from "./event-status";

describe("canTransitionEventStatus", () => {
  it("publishes drafts and cancels drafts or published events", () => {
    expect(canTransitionEventStatus("DRAFT", "PUBLISHED")).toBe(true);
    expect(canTransitionEventStatus("DRAFT", "CANCELLED")).toBe(true);
    expect(canTransitionEventStatus("PUBLISHED", "CANCELLED")).toBe(true);
  });

  it("does not unpublish, republish or revive cancelled events", () => {
    expect(canTransitionEventStatus("PUBLISHED", "DRAFT")).toBe(false);
    expect(canTransitionEventStatus("CANCELLED", "PUBLISHED")).toBe(false);
    expect(canTransitionEventStatus("CANCELLED", "DRAFT")).toBe(false);
  });

  it("rejects no-op transitions", () => {
    expect(canTransitionEventStatus("PUBLISHED", "PUBLISHED")).toBe(false);
  });
});
