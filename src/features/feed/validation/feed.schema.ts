import { z } from "zod";

import { REPORT_REASONS } from "@/features/reports/services/report.service";
import { cleanText } from "@/lib/security/text";

import { COMMENT_BODY_MAX_LENGTH, POST_BODY_MAX_LENGTH } from "../domain/feed-content-rules";

const identifier = z.string().min(1).max(64);

/** Free text is cleaned first, so whitespace-only input counts as empty. */
function bodyOf(maxLength: number) {
  return z
    .string()
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(1, "Add some text before saving.")
        .max(maxLength, `Use ${maxLength} characters or fewer.`),
    );
}

const postBody = bodyOf(POST_BODY_MAX_LENGTH);
const commentBody = bodyOf(COMMENT_BODY_MAX_LENGTH);

export const createPostSchema = z.object({
  groupId: identifier.nullable(),
  body: postBody,
});

export const editPostSchema = z.object({
  postId: identifier,
  body: postBody,
});

export const postTargetSchema = z.object({
  postId: identifier,
});

export const setPostPinnedSchema = z.object({
  postId: identifier,
  pinned: z.boolean(),
});

export const createCommentSchema = z.object({
  postId: identifier,
  body: commentBody,
});

export const editCommentSchema = z.object({
  commentId: identifier,
  body: commentBody,
});

export const commentTargetSchema = z.object({
  commentId: identifier,
});

export const reportContentSchema = z.object({
  targetType: z.enum(["POST", "COMMENT"]),
  targetId: identifier,
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(1000).optional(),
});
