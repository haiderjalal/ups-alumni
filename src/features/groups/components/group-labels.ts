import type { GroupKind } from "@/generated/prisma/client";

import type { GroupJoinPolicy, GroupMembershipStatus } from "../domain/group-rules";

export const GROUP_KIND_LABELS: Record<GroupKind, string> = {
  BATCH: "Batch",
  PROFESSION: "Profession",
  CHAPTER: "City or chapter",
  INTEREST: "Interest",
};

export const JOIN_POLICY_LABELS: Record<GroupJoinPolicy, string> = {
  OPEN: "Open to members",
  REQUEST: "Join on request",
};

/** Label for the viewer's own standing in a group. Removed memberships read as "not joined". */
export function membershipLabel(status: GroupMembershipStatus | null): string | null {
  if (status === "ACTIVE") {
    return "Member";
  }
  if (status === "PENDING") {
    return "Request pending";
  }
  return null;
}
