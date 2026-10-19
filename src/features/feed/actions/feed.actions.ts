"use server";

import type { ZodError } from "zod";

import { requireActiveMember } from "@/lib/session";
import { formatDateTime } from "@/lib/time";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { listPostComments } from "../services/feed-query.service";
import { createFeedComment, editFeedComment, removeFeedComment } from "../services/feed-comment.service";
import { reportFeedContent } from "../services/feed-moderation.service";
import { createFeedPost, editFeedPost, removeFeedPost, setFeedPostPinned } from "../services/feed-post.service";
import { toggleFeedReaction } from "../services/feed-reaction.service";
import {
  commentTargetSchema,
  createCommentSchema,
  createPostSchema,
  editCommentSchema,
  editPostSchema,
  postTargetSchema,
  reportContentSchema,
  setPostPinnedSchema,
} from "../validation/feed.schema";
import { firstIssueMessage, toFieldErrors } from "../validation/field-errors";

export interface CommentDisplay {
  id: string;
  body: string;
  authorName: string;
  createdLabel: string;
  isEdited: boolean;
  isOwn: boolean;
  canEdit: boolean;
  canRemove: boolean;
}

const INVALID_INPUT = "Check the highlighted fields and try again.";

function invalid(error: ZodError): ActionResult<never> {
  return actionError(firstIssueMessage(error, INVALID_INPUT), toFieldErrors(error));
}

export async function createPostAction(input: {
  groupId: string | null;
  body: string;
}): Promise<ActionResult<{ postId: string }>> {
  const user = await requireActiveMember();
  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  return createFeedPost({ userId: user.id, groupId: parsed.data.groupId, body: parsed.data.body });
}

export async function editPostAction(input: { postId: string; body: string }): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = editPostSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  return editFeedPost({ userId: user.id, postId: parsed.data.postId, body: parsed.data.body });
}

export async function removePostAction(input: { postId: string }): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = postTargetSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  return removeFeedPost({ userId: user.id, postId: parsed.data.postId });
}

export async function setPostPinnedAction(input: { postId: string; pinned: boolean }): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = setPostPinnedSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  return setFeedPostPinned({ userId: user.id, postId: parsed.data.postId, pinned: parsed.data.pinned });
}

export async function toggleReactionAction(input: { postId: string }): Promise<ActionResult<{ reacted: boolean }>> {
  const user = await requireActiveMember();
  const parsed = postTargetSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  return toggleFeedReaction({ userId: user.id, postId: parsed.data.postId });
}

export async function loadCommentsAction(input: { postId: string }): Promise<ActionResult<CommentDisplay[]>> {
  const user = await requireActiveMember();
  const parsed = postTargetSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  const comments = await listPostComments({ postId: parsed.data.postId, userId: user.id });
  if (!comments) {
    return actionError("This post is not available.");
  }
  return actionOk(
    comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      authorName: comment.authorName,
      createdLabel: formatDateTime(comment.createdAt),
      isEdited: comment.isEdited,
      isOwn: comment.isOwn,
      canEdit: comment.canEdit,
      canRemove: comment.canRemove,
    })),
  );
}

export async function createCommentAction(input: {
  postId: string;
  body: string;
}): Promise<ActionResult<{ commentId: string }>> {
  const user = await requireActiveMember();
  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  return createFeedComment({ userId: user.id, postId: parsed.data.postId, body: parsed.data.body });
}

export async function editCommentAction(input: { commentId: string; body: string }): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = editCommentSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  return editFeedComment({ userId: user.id, commentId: parsed.data.commentId, body: parsed.data.body });
}

export async function removeCommentAction(input: { commentId: string }): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = commentTargetSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  return removeFeedComment({ userId: user.id, commentId: parsed.data.commentId });
}

export async function reportContentAction(input: {
  targetType: "POST" | "COMMENT";
  targetId: string;
  reason: string;
  details?: string;
}): Promise<ActionResult<{ alreadyOpen: boolean }>> {
  const user = await requireActiveMember();
  const parsed = reportContentSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error);
  }
  return reportFeedContent({ reporterId: user.id, report: parsed.data });
}
