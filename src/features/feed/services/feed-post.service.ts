import "server-only";

import { recordAudit } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { canPinPost, canEditOwnContent, canRemoveContent } from "../domain/feed-content-rules";
import { canParticipate } from "../domain/feed-visibility";

import { loadPostAccess, resolveScopeAccess } from "./feed-access.service";

const POST_UNAVAILABLE = "This post is not available.";

/** Posts in the global feed (groupId null) or in a group. Validated input only; the action layer checks length. */
export async function createFeedPost(input: {
  userId: string;
  groupId: string | null;
  body: string;
}): Promise<ActionResult<{ postId: string }>> {
  const access = await resolveScopeAccess({ userId: input.userId, groupId: input.groupId });
  if (!access || !canParticipate(access.scope, access.viewer)) {
    return actionError("You cannot post in this feed.");
  }

  const post = await db.post.create({
    data: { authorId: input.userId, groupId: input.groupId, body: input.body },
    select: { id: true },
  });
  log("info", "feed.post.created", { postId: post.id, groupId: input.groupId });
  return actionOk({ postId: post.id });
}

export async function editFeedPost(input: { userId: string; postId: string; body: string }): Promise<ActionResult> {
  const found = await loadPostAccess({ postId: input.postId, userId: input.userId });
  if (!found || !canParticipate(found.access.scope, found.access.viewer)) {
    return actionError(POST_UNAVAILABLE);
  }
  if (!canEditOwnContent(found.post, input.userId)) {
    return actionError("Only the author can edit this post.");
  }

  const updated = await db.post.updateMany({
    where: { id: input.postId, authorId: input.userId, status: "VISIBLE" },
    data: { body: input.body, editedAt: new Date() },
  });
  return updated.count === 1 ? actionOk() : actionError("This post can no longer be edited.");
}

/**
 * Soft-deletes a post by setting its status to REMOVED, so reports and audit trails keep their target.
 * Moderator removals are audited in the same transaction.
 */
export async function removeFeedPost(input: { userId: string; postId: string }): Promise<ActionResult> {
  const found = await loadPostAccess({ postId: input.postId, userId: input.userId });
  if (!found) {
    return actionError(POST_UNAVAILABLE);
  }
  const actor = { userId: input.userId, isGroupModerator: found.access.isGroupModerator };
  if (!canRemoveContent(found.post, actor)) {
    return actionError("You cannot remove this post.");
  }

  const isModeratorRemoval = found.post.authorId !== input.userId;
  const removed = await db.$transaction(async (tx) => {
    const result = await tx.post.updateMany({
      where: { id: input.postId, status: "VISIBLE" },
      data: { status: "REMOVED" },
    });
    if (result.count !== 1) {
      return false;
    }
    if (isModeratorRemoval) {
      await recordAudit(tx, {
        action: "feed.post.removed",
        entityType: "post",
        entityId: input.postId,
        actorId: input.userId,
        metadata: { groupId: found.post.groupId },
      });
    }
    return true;
  });
  return removed ? actionOk() : actionError("This post has already been removed.");
}

/** Pins or unpins a group post. Only group moderators and representatives may do this. */
export async function setFeedPostPinned(input: {
  userId: string;
  postId: string;
  pinned: boolean;
}): Promise<ActionResult> {
  const found = await loadPostAccess({ postId: input.postId, userId: input.userId });
  if (!found || !canParticipate(found.access.scope, found.access.viewer)) {
    return actionError(POST_UNAVAILABLE);
  }
  if (!canPinPost(found.post, { userId: input.userId, isGroupModerator: found.access.isGroupModerator })) {
    return actionError("Only group moderators can pin posts.");
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.post.updateMany({
      where: { id: input.postId, status: "VISIBLE" },
      data: { isPinned: input.pinned },
    });
    if (result.count !== 1) {
      return false;
    }
    await recordAudit(tx, {
      action: input.pinned ? "feed.post.pinned" : "feed.post.unpinned",
      entityType: "post",
      entityId: input.postId,
      actorId: input.userId,
      metadata: { groupId: found.post.groupId },
    });
    return true;
  });
  return updated ? actionOk() : actionError(POST_UNAVAILABLE);
}
