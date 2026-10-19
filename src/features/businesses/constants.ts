import type { BusinessStatus } from "./domain/business-rules";

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Awaiting review",
  PUBLISHED: "Published",
  REJECTED: "Not approved",
  CLOSED: "Closed",
};
