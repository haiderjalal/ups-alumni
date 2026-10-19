import type { OpportunityStatus } from "./domain/opportunity-rules";

export const OPPORTUNITY_CATEGORIES = [
  "JOB",
  "INTERNSHIP",
  "FREELANCE",
  "VOLUNTEER",
] as const;
export type OpportunityCategoryValue = (typeof OPPORTUNITY_CATEGORIES)[number];

export const REMOTE_TYPES = ["ONSITE", "HYBRID", "REMOTE"] as const;
export type RemoteTypeValue = (typeof REMOTE_TYPES)[number];

export const OPPORTUNITY_CATEGORY_LABELS: Record<
  OpportunityCategoryValue,
  string
> = {
  JOB: "Job",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance project",
  VOLUNTEER: "Volunteer role",
};

export const REMOTE_TYPE_LABELS: Record<RemoteTypeValue, string> = {
  ONSITE: "On site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Awaiting review",
  PUBLISHED: "Published",
  REJECTED: "Not approved",
  CLOSED: "Closed",
};

export const OPPORTUNITY_PAGE_SIZE = 12;
