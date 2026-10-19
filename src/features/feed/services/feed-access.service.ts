import "server-only";

import { getGroupModerationScope } from "@/features/groups/services/group-moderation.service";
import { db } from "@/lib/db";

import { canViewFeed, canViewPost, type FeedScope, type FeedViewer } from "../domain/feed-visibility";
import type { ContentStatus } from "../domain/feed-content-rules";

import { isBlockedBetween } from "./block-lookup.service";

/** What the viewer may do in one feed scope. Built only from database facts read on the server. */
export interface ScopeAccess {
  groupId: string | null;
  scope: FeedScope;
  viewer: FeedViewer;
  isGroupModerator: boolean;
}

export interface PostAccess {
  post: { id: string; authorId: string; groupId: string | null; status: ContentStatus };
  access: ScopeAccess;
}

export async function isActivePlatformMember(userId: string): Promise<boolean> {
  const membership = await db.membership.findUnique({ where: { userId }, select: { status: true } });
  return membership?.status === "ACTIVE";
}

/**
 * Resolves the viewer's access to a feed. Returns null when the viewer is not an ACTIVE member, the group
 * does not exist, or the group feed is private and the viewer is not an ACTIVE member of it. Callers
 * treat null as "not found" so that private groups are not revealed.
 */
export async function resolveScopeAccess(input: { userId: string; groupId: string | null }): Promise<ScopeAccess | null> {
  if (!(await isActivePlatformMember(input.userId))) {
    return null;
  }

  if (input.groupId === null) {
    return {
      groupId: null,
      scope: { kind: "GLOBAL" },
      viewer: { isActiveMember: true, isActiveGroupMember: false },
      isGroupModerator: false,
    };
  }

  const [group, membership] = await Promise.all([
    db.group.findUnique({ where: { id: input.groupId }, select: { isPrivate: true } }),
    db.groupMembership.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId: input.userId } },
      select: { status: true },
    }),
  ]);
  if (!group) {
    return null;
  }

  const scope: FeedScope = { kind: "GROUP", isPrivate: group.isPrivate };
  const viewer: FeedViewer = { isActiveMember: true, isActiveGroupMember: membership?.status === "ACTIVE" };
  if (!canViewFeed(scope, viewer)) {
    return null;
  }

  const moderatedGroupIds = await getGroupModerationScope(input.userId);
  return {
    groupId: input.groupId,
    scope,
    viewer,
    isGroupModerator: moderatedGroupIds.includes(input.groupId),
  };
}

/**
 * Loads a post the viewer may see, with the access context needed for the requested action. Returns null
 * when the post does not exist, sits in a feed the viewer cannot see, or was written by someone who blocks
 * the viewer or whom the viewer blocks.
 */
export async function loadPostAccess(input: { postId: string; userId: string }): Promise<PostAccess | null> {
  const post = await db.post.findUnique({
    where: { id: input.postId },
    select: { id: true, authorId: true, groupId: true, status: true },
  });
  if (!post) {
    return null;
  }

  const access = await resolveScopeAccess({ userId: input.userId, groupId: post.groupId });
  if (!access) {
    return null;
  }

  const blocked = await isBlockedBetween(input.userId, post.authorId);
  if (!canViewPost(access.scope, access.viewer, blocked)) {
    return null;
  }

  return { post, access };
}
