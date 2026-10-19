/**
 * Business listing rules. Pure functions only: no database, framework or server-only imports, so the
 * rules can be tested in isolation. Services call these before every status write.
 */

export type BusinessStatus =
  "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "CLOSED";

/** Owner-editable listing content. Changing any of these on a published listing sends it back for review. */
export interface BusinessContent {
  name: string;
  sector: string;
  city: string;
  description: string;
  productsServices: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface PublicContact {
  email: string | null;
  phone: string | null;
}

export interface ContactSource {
  status: BusinessStatus;
  publishContact: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface SubmitDecisionInput {
  status: BusinessStatus;
  currentPublishContact: boolean;
  nextPublishContact: boolean;
}

/** A member may send one collaboration message per business in this window. */
export const COLLABORATION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const SLUG_MAX_LENGTH = 60;

const BUSINESS_TRANSITIONS: Readonly<
  Record<BusinessStatus, readonly BusinessStatus[]>
> = {
  DRAFT: ["PENDING_REVIEW"],
  PENDING_REVIEW: ["PUBLISHED", "REJECTED"],
  PUBLISHED: ["PENDING_REVIEW"],
  REJECTED: ["PENDING_REVIEW"],
  CLOSED: [],
};

const CONTENT_FIELDS: readonly (keyof BusinessContent)[] = [
  "name",
  "sector",
  "city",
  "description",
  "productsServices",
  "websiteUrl",
  "contactEmail",
  "contactPhone",
];

export function canTransitionBusiness(
  from: BusinessStatus,
  to: BusinessStatus,
): boolean {
  return BUSINESS_TRANSITIONS[from].includes(to);
}

export function hasBusinessContentChanged(
  current: BusinessContent,
  next: BusinessContent,
): boolean {
  return CONTENT_FIELDS.some((field) => current[field] !== next[field]);
}

/** Pending listings are frozen so that staff review exactly the content that will go live. */
export function canEditBusiness(status: BusinessStatus): boolean {
  return status === "DRAFT" || status === "REJECTED" || status === "PUBLISHED";
}

/** Editing a published listing hides it until staff approve the change. Other statuses are unchanged. */
export function statusAfterEdit(
  status: BusinessStatus,
  contentChanged: boolean,
): BusinessStatus {
  return status === "PUBLISHED" && contentChanged ? "PENDING_REVIEW" : status;
}

/**
 * Drafts and rejected listings can be submitted. A published listing can only be resubmitted to change
 * its contact opt-in, because any other change already sent it back for review.
 */
export function canSubmitBusiness(input: SubmitDecisionInput): boolean {
  if (input.status === "DRAFT" || input.status === "REJECTED") {
    return true;
  }
  if (input.status === "PUBLISHED") {
    return input.currentPublishContact !== input.nextPublishContact;
  }
  return false;
}

/**
 * Business contact details are public only when the owner opted in AND staff approved the listing.
 * Returns null whenever the details must stay hidden.
 */
export function getPublicContact(source: ContactSource): PublicContact | null {
  const isPublic = source.publishContact && source.status === "PUBLISHED";
  if (!isPublic || (!source.contactEmail && !source.contactPhone)) {
    return null;
  }
  return { email: source.contactEmail, phone: source.contactPhone };
}

export function canSendCollaborationRequest(
  lastSentAt: Date | null,
  now: Date,
): boolean {
  return (
    lastSentAt === null ||
    now.getTime() - lastSentAt.getTime() >= COLLABORATION_COOLDOWN_MS
  );
}

export function collaborationAvailableAt(lastSentAt: Date): Date {
  return new Date(lastSentAt.getTime() + COLLABORATION_COOLDOWN_MS);
}

/** URL-safe slug from the business name. The random suffix keeps slugs unique and hard to guess. */
export function buildBusinessSlug(name: string, suffix: string): string {
  const ascii = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const words = ascii
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
  return `${words || "business"}-${suffix}`;
}
