import "server-only";

import { recordAudit } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { canEditOwnContent, canRemoveContent } from "../domain/feed-content-rules";
import { canParticipate } from "../domain/feed-visibility";

import { loadPostAccess } from "./feed-access.service";

const COMMENT_UNAVAILABLE = "This comment is not available.";

export async function createFeedComment(input: {
  userId: string;
  postId: string;
  body: string;
}): Promise<ActionResult<{ commentId: string }>> {
  const found = await loadPostAccess({ postId: input.postId, userId: input.userId });
  if (!found || !canParticipate(found.access.scope, found.access.viewer) || found.post.status !== "VISIBLE") {
    return actionError("This post is not open for comments.");
  }

  const comment = await db.comment.create({
    data: { postId: input.postId, authorId: input.userId, body: input.body },
    select: { id: true },
  });
  return actionOk({ commentId: comment.id });
}

export async function editFeedComment(input: {
  userId: string;
  commentId: string;
  body: string;
}): Promise<ActionResult> {
  const comment = await db.comment.findUnique({
    where: { id: input.commentId },
    select: { id: true, postId: true, authorId: true, status: true },
  });
  if (!comment) {
    return actionError(COMMENT_UNAVAILABLE);
  }

  const found = await loadPostAccess({ postId: comment.postId, userId: input.userId });
  if (!found || !canParticipate(found.access.scope, found.access.viewer)) {
    return actionError(COMMENT_UNAVAILABLE);
  }
  if (!canEditOwnContent(comment, input.userId)) {
    return actionError("Only the author can edit this comment.");
  }

  const updated = await db.comment.updateMany({
    where: { id: input.commentId, authorId: input.userId, status: "VISIBLE" },
    data: { body: input.body },
  });
  return updated.count === 1 ? actionOk() : actionError("This comment can no longer be edited.");
}

/** Removes a comment by its author or by a moderator of the post's group. Moderator removals are audited. */
export async function removeFeedComment(input: { userId: string; commentId: string }): Promise<ActionResult> {
  const comment = await db.comment.findUnique({
    where: { id: input.commentId },
    select: { id: true, postId: true, authorId: true, status: true },
  });
  if (!comment) {
    return actionError(COMMENT_UNAVAILABLE);
  }

  const found = await loadPostAccess({ postId: comment.postId, userId: input.userId });
  if (!found) {
    return actionError(COMMENT_UNAVAILABLE);
  }
  const actor = { userId: input.userId, isGroupModerator: found.access.isGroupModerator };
  if (!canRemoveContent(comment, actor)) {
    return actionError("You cannot remove this comment.");
  }

  const isModeratorRemoval = comment.authorId !== input.userId;
  const removed = await db.$transaction(async (tx) => {
    const result = await tx.comment.updateMany({
      where: { id: input.commentId, status: "VISIBLE" },
      data: { status: "REMOVED" },
    });
    if (result.count !== 1) {
      return false;
    }
    if (isModeratorRemoval) {
      await recordAudit(tx, {
        action: "feed.comment.removed",
        entityType: "comment",
        entityId: input.commentId,
        actorId: input.userId,
        metadata: { postId: comment.postId },
      });
    }
    return true;
  });
  return removed ? actionOk() : actionError(COMMENT_UNAVAILABLE);
}
