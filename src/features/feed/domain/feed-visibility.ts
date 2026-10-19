/**
 * Who may view and take part in community feed content. Pure: the feed services call these functions
 * with facts read from the database on the server. Clients never supply these values.
 */

export type FeedScope = { kind: "GLOBAL" } | { kind: "GROUP"; isPrivate: boolean };

export interface FeedViewer {
  /** Platform membership is ACTIVE. */
  isActiveMember: boolean;
  /** GroupMembership is ACTIVE for the scope's group. Always false for the global feed. */
  isActiveGroupMember: boolean;
}

/**
 * Global feed and public group feeds are visible to every ACTIVE member. A private group feed is
 * visible only to ACTIVE members of that group.
 */
export function canViewFeed(scope: FeedScope, viewer: FeedViewer): boolean {
  if (!viewer.isActiveMember) {
    return false;
  }
  if (scope.kind === "GLOBAL") {
    return true;
  }
  return !scope.isPrivate || viewer.isActiveGroupMember;
}

/**
 * Posting, commenting and reacting require ACTIVE membership of the group. Viewing a public group needs
 * only platform membership.
 */
export function canParticipate(scope: FeedScope, viewer: FeedViewer): boolean {
  if (!viewer.isActiveMember) {
    return false;
  }
  return scope.kind === "GLOBAL" || viewer.isActiveGroupMember;
}

/**
 * A post or comment is hidden from either party when the two members block each other in either
 * direction. The caller computes `blockedWithAuthor` from the Block table.
 */
export function canViewPost(scope: FeedScope, viewer: FeedViewer, blockedWithAuthor: boolean): boolean {
  return !blockedWithAuthor && canViewFeed(scope, viewer);
}
