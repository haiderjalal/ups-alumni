/**
 * Ownership, moderation and length rules for posts and comments. Pure: no framework or database imports.
 */

export const POST_BODY_MAX_LENGTH = 4000;
export const COMMENT_BODY_MAX_LENGTH = 2000;

/** Only VISIBLE content can be edited, removed again or pinned. */
export type ContentStatus = "VISIBLE" | "HIDDEN" | "REMOVED";

export interface ContentOwnership {
  authorId: string;
  status: ContentStatus;
}

export interface ContentActor {
  userId: string;
  /** The actor moderates the group this content belongs to. Always false for global feed content. */
  isGroupModerator: boolean;
}

/** Authors edit their own visible posts and comments. */
export function canEditOwnContent(content: ContentOwnership, actorUserId: string): boolean {
  return content.status === "VISIBLE" && content.authorId === actorUserId;
}

/** Authors remove their own content. Group moderators remove content in their group. */
export function canRemoveContent(content: ContentOwnership, actor: ContentActor): boolean {
  if (content.status !== "VISIBLE") {
    return false;
  }
  return content.authorId === actor.userId || actor.isGroupModerator;
}

/** Only group moderators pin, and only posts that belong to a group. Global posts are never pinned. */
export function canPinPost(post: { groupId: string | null }, actor: ContentActor): boolean {
  return post.groupId !== null && actor.isGroupModerator;
}
