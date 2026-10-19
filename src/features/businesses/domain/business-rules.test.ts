import { describe, expect, it } from "vitest";

import {
  type BusinessContent,
  type BusinessStatus,
  buildBusinessSlug,
  canEditBusiness,
  canSendCollaborationRequest,
  canSubmitBusiness,
  canTransitionBusiness,
  collaborationAvailableAt,
  COLLABORATION_COOLDOWN_MS,
  getPublicContact,
  hasBusinessContentChanged,
  statusAfterEdit,
} from "./business-rules";

const DAY_MS = 24 * 60 * 60 * 1000;

function content(overrides: Partial<BusinessContent> = {}): BusinessContent {
  return {
    name: "Malakand Bakery",
    sector: "Food",
    city: "Chakdara",
    description: "Bread and pastries.",
    productsServices: "Bread, cakes",
    websiteUrl: null,
    contactEmail: "hello@example.com",
    contactPhone: "+923001234567",
    ...overrides,
  };
}

describe("canTransitionBusiness", () => {
  it.each<[BusinessStatus, BusinessStatus, boolean]>([
    ["DRAFT", "PENDING_REVIEW", true],
    ["PENDING_REVIEW", "PUBLISHED", true],
    ["PENDING_REVIEW", "REJECTED", true],
    ["REJECTED", "PENDING_REVIEW", true],
    ["PUBLISHED", "PENDING_REVIEW", true],
    ["DRAFT", "PUBLISHED", false],
    ["PENDING_REVIEW", "DRAFT", false],
    ["PUBLISHED", "REJECTED", false],
    ["CLOSED", "PENDING_REVIEW", false],
  ])("%s to %s is allowed: %s", (from, to, expected) => {
    expect(canTransitionBusiness(from, to)).toBe(expected);
  });
});

describe("canEditBusiness and statusAfterEdit", () => {
  it("freezes listings awaiting review", () => {
    expect(canEditBusiness("PENDING_REVIEW")).toBe(false);
    expect(canEditBusiness("CLOSED")).toBe(false);
    expect(canEditBusiness("DRAFT")).toBe(true);
  });

  it("sends a changed published listing back for review", () => {
    expect(statusAfterEdit("PUBLISHED", true)).toBe("PENDING_REVIEW");
    expect(statusAfterEdit("PUBLISHED", false)).toBe("PUBLISHED");
    expect(statusAfterEdit("DRAFT", true)).toBe("DRAFT");
    expect(statusAfterEdit("REJECTED", true)).toBe("REJECTED");
  });
});

describe("canSubmitBusiness", () => {
  it("allows submission of drafts and rejected listings", () => {
    expect(
      canSubmitBusiness({
        status: "DRAFT",
        currentPublishContact: false,
        nextPublishContact: true,
      }),
    ).toBe(true);
    expect(
      canSubmitBusiness({
        status: "REJECTED",
        currentPublishContact: true,
        nextPublishContact: true,
      }),
    ).toBe(true);
  });

  it("allows a published listing to resubmit only when its contact opt-in changes", () => {
    expect(
      canSubmitBusiness({
        status: "PUBLISHED",
        currentPublishContact: true,
        nextPublishContact: false,
      }),
    ).toBe(true);
    expect(
      canSubmitBusiness({
        status: "PUBLISHED",
        currentPublishContact: true,
        nextPublishContact: true,
      }),
    ).toBe(false);
  });

  it("rejects submission while pending or closed", () => {
    expect(
      canSubmitBusiness({
        status: "PENDING_REVIEW",
        currentPublishContact: false,
        nextPublishContact: true,
      }),
    ).toBe(false);
    expect(
      canSubmitBusiness({
        status: "CLOSED",
        currentPublishContact: false,
        nextPublishContact: true,
      }),
    ).toBe(false);
  });
});

describe("hasBusinessContentChanged", () => {
  it("is false for identical content", () => {
    expect(hasBusinessContentChanged(content(), content())).toBe(false);
  });

  it("detects a change in any owner-editable field", () => {
    expect(
      hasBusinessContentChanged(
        content(),
        content({ contactPhone: "+923009999999" }),
      ),
    ).toBe(true);
    expect(
      hasBusinessContentChanged(
        content(),
        content({ websiteUrl: "https://example.com/" }),
      ),
    ).toBe(true);
  });
});

describe("getPublicContact", () => {
  const published = {
    status: "PUBLISHED" as const,
    publishContact: true,
    contactEmail: "hello@example.com",
    contactPhone: "+923001234567",
  };

  it("exposes contact details only when opted in and published", () => {
    expect(getPublicContact(published)).toEqual({
      email: "hello@example.com",
      phone: "+923001234567",
    });
  });

  it("hides contact details when the owner has not opted in", () => {
    expect(
      getPublicContact({ ...published, publishContact: false }),
    ).toBeNull();
  });

  it("hides contact details for every status other than published", () => {
    const statuses: BusinessStatus[] = [
      "DRAFT",
      "PENDING_REVIEW",
      "REJECTED",
      "CLOSED",
    ];
    for (const status of statuses) {
      expect(getPublicContact({ ...published, status })).toBeNull();
    }
  });

  it("returns null when there is nothing to show", () => {
    expect(
      getPublicContact({
        ...published,
        contactEmail: null,
        contactPhone: null,
      }),
    ).toBeNull();
  });
});

describe("collaboration cooldown", () => {
  const now = new Date("2026-10-19T12:00:00Z");

  it("allows the first message", () => {
    expect(canSendCollaborationRequest(null, now)).toBe(true);
  });

  it("blocks a second message within seven days", () => {
    expect(
      canSendCollaborationRequest(new Date(now.getTime() - 6 * DAY_MS), now),
    ).toBe(false);
  });

  it("allows a message exactly seven days after the last one", () => {
    expect(
      canSendCollaborationRequest(
        new Date(now.getTime() - COLLABORATION_COOLDOWN_MS),
        now,
      ),
    ).toBe(true);
  });

  it("reports when the next message becomes available", () => {
    const last = new Date("2026-10-10T08:00:00Z");
    expect(collaborationAvailableAt(last).toISOString()).toBe(
      "2026-10-17T08:00:00.000Z",
    );
  });
});

describe("buildBusinessSlug", () => {
  it("builds a lowercase hyphenated slug with the suffix", () => {
    expect(buildBusinessSlug("Ali's Bakery & Café", "a1b2c3")).toBe(
      "ali-s-bakery-cafe-a1b2c3",
    );
  });

  it("falls back when the name has no latin letters", () => {
    expect(buildBusinessSlug("ابراہیم", "ff00")).toBe("business-ff00");
  });

  it("caps the readable part of the slug", () => {
    const slug = buildBusinessSlug("a".repeat(200), "x1");
    expect(slug.length).toBeLessThanOrEqual(60 + 1 + 2);
    expect(slug.endsWith("-x1")).toBe(true);
  });
});
