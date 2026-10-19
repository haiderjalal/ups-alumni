/**
 * Group membership and moderation rules. Pure: no framework or database imports.
 */

export type GroupJoinPolicy = "OPEN" | "REQUEST";

export type GroupMembershipStatus = "PENDING" | "ACTIVE" | "REMOVED";

export type GroupModerationAction = "APPROVE" | "REMOVE";

export type JoinDecision =
  | { kind: "ALREADY_MEMBER" }
  | { kind: "ALREADY_REQUESTED" }
  | { kind: "SET_STATUS"; status: "ACTIVE" | "PENDING" };

/**
 * OPEN groups admit the member straight away. REQUEST groups hold the member as PENDING until a
 * moderator approves. A REMOVED membership starts over under the same policy.
 */
export function resolveJoin(joinPolicy: GroupJoinPolicy, existing: GroupMembershipStatus | null): JoinDecision {
  if (existing === "ACTIVE") {
    return { kind: "ALREADY_MEMBER" };
  }
  if (existing === "PENDING") {
    return { kind: "ALREADY_REQUESTED" };
  }
  return { kind: "SET_STATUS", status: joinPolicy === "OPEN" ? "ACTIVE" : "PENDING" };
}

/** Private groups are visible only to their ACTIVE members. Public groups are visible to all members. */
export function canViewGroup(group: { isPrivate: boolean }, membership: GroupMembershipStatus | null): boolean {
  return !group.isPrivate || membership === "ACTIVE";
}

/**
 * Approval applies only to a pending request. Removal applies to a pending request or an active member.
 * Returns null when the action does not change the current status.
 */
export function nextStatusForModeration(
  action: GroupModerationAction,
  current: GroupMembershipStatus,
): GroupMembershipStatus | null {
  if (action === "APPROVE") {
    return current === "PENDING" ? "ACTIVE" : null;
  }
  return current === "PENDING" || current === "ACTIVE" ? "REMOVED" : null;
}

/** Leaving a group ends a pending request or an active membership. */
export function nextStatusForLeave(current: GroupMembershipStatus): GroupMembershipStatus | null {
  return current === "PENDING" || current === "ACTIVE" ? "REMOVED" : null;
}

/** Moderators leave through the member action, not the moderation action, so they cannot remove themselves here. */
export function canModerateMember(actorUserId: string, targetUserId: string): boolean {
  return actorUserId !== targetUserId;
}
