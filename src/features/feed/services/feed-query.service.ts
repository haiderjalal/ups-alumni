import "server-only";

import { db } from "@/lib/db";

import { canParticipate } from "../domain/feed-visibility";
import { canEditOwnContent, canPinPost, canRemoveContent } from "../domain/feed-content-rules";

import { listBlockedUserIds } from "./block-lookup.service";
import { loadPostAccess, resolveScopeAccess } from "./feed-access.service";

export const FEED_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_COMMENTS_PER_POST = 200;

export interface FeedPostView {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date;
  editedAt: Date | null;
  isPinned: boolean;
  reactionCount: number;
  viewerHasReacted: boolean;
  commentCount: number;
  isOwn: boolean;
  canEdit: boolean;
  canRemove: boolean;
  canPin: boolean;
}

export interface FeedPage {
  groupId: string | null;
  /** Whether the viewer may post, comment and react in this feed. */
  canParticipate: boolean;
  pinned: FeedPostView[];
  posts: FeedPostView[];
  /** Cursor for the next, older page. Null when this is the last page. */
  nextCursor: string | null;
}

export interface CommentView {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date;
  isEdited: boolean;
  isOwn: boolean;
  canEdit: boolean;
  canRemove: boolean;
}

const POST_SELECT = {
  id: true,
  body: true,
  authorId: true,
  groupId: true,
  status: true,
  isPinned: true,
  editedAt: true,
  createdAt: true,
  author: { select: { name: true } },
} as const;

type PostRow = {
  id: string;
  body: string;
  authorId: string;
  groupId: string | null;
  status: "VISIBLE" | "HIDDEN" | "REMOVED";
  isPinned: boolean;
  editedAt: Date | null;
  createdAt: Date;
  author: { name: string };
};

/**
 * One page of posts in a feed, newest first, with pinned posts on the first page. Returns null when the
 * viewer may not see the feed. Posts from members who block the viewer, or whom the viewer blocks, are omitted.
 */
export async function listFeedPage(input: {
  userId: string;
  groupId: string | null;
  before: Date | null;
  pageSize?: number;
}): Promise<FeedPage | null> {
  const access = await resolveScopeAccess({ userId: input.userId, groupId: input.groupId });
  if (!access) {
    return null;
  }

  const pageSize = Math.min(Math.max(input.pageSize ?? FEED_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const blockedUserIds = await listBlockedUserIds(input.userId);
  const visibleBy = { status: "VISIBLE" as const, authorId: { notIn: blockedUserIds } };

  const [rows, pinnedRows] = await Promise.all([
    db.post.findMany({
      where: {
        ...visibleBy,
        groupId: input.groupId,
        isPinned: false,
        ...(input.before ? { createdAt: { lt: input.before } } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: pageSize + 1,
      select: POST_SELECT,
    }),
    input.groupId !== null && input.before === null
      ? db.post.findMany({
          where: { ...visibleBy, groupId: input.groupId, isPinned: true },
          orderBy: { createdAt: "desc" },
          take: MAX_PAGE_SIZE,
          select: POST_SELECT,
        })
      : Promise.resolve([] as PostRow[]),
  ]);

  const hasMore = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);
  const views = await toPostViews({
    rows: [...pinnedRows, ...pageRows],
    userId: input.userId,
    isGroupModerator: access.isGroupModerator,
    blockedUserIds,
  });
  const viewById = new Map(views.map((view) => [view.id, view]));

  return {
    groupId: input.groupId,
    canParticipate: canParticipate(access.scope, access.viewer),
    pinned: pinnedRows.map((row) => viewById.get(row.id)).filter(isPostView),
    posts: pageRows.map((row) => viewById.get(row.id)).filter(isPostView),
    nextCursor: hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1].createdAt.toISOString() : null,
  };
}

/** Visible comments on a post, oldest first. Null when the viewer may not see the post. */
export async function listPostComments(input: { postId: string; userId: string }): Promise<CommentView[] | null> {
  const found = await loadPostAccess(input);
  if (!found) {
    return null;
  }

  const blockedUserIds = await listBlockedUserIds(input.userId);
  const rows = await db.comment.findMany({
    where: { postId: input.postId, status: "VISIBLE", authorId: { notIn: blockedUserIds } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MAX_COMMENTS_PER_POST,
    select: {
      id: true,
      body: true,
      authorId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true } },
    },
  });

  return rows.map((row) => {
    const isAuthor = row.authorId === input.userId;
    const content = { authorId: row.authorId, status: row.status };
    return {
      id: row.id,
      body: row.body,
      authorName: row.author.name,
      createdAt: row.createdAt,
      // Comments change only when edited or removed, so an update later than creation means an edit.
      isEdited: row.updatedAt.getTime() - row.createdAt.getTime() > 1000,
      isOwn: isAuthor,
      canEdit: isAuthor && canEditOwnContent(content, input.userId),
      canRemove: canRemoveContent(content, {
        userId: input.userId,
        isGroupModerator: found.access.isGroupModerator,
      }),
    };
  });
}

async function toPostViews(input: {
  rows: PostRow[];
  userId: string;
  isGroupModerator: boolean;
  blockedUserIds: string[];
}): Promise<FeedPostView[]> {
  const { rows, userId, isGroupModerator, blockedUserIds } = input;
  if (rows.length === 0) {
    return [];
  }

  const postIds = rows.map((row) => row.id);
  const [reactionTotals, ownReactions, commentTotals] = await Promise.all([
    db.reaction.groupBy({ by: ["postId"], where: { postId: { in: postIds } }, _count: { _all: true } }),
    db.reaction.findMany({ where: { userId, postId: { in: postIds } }, select: { postId: true } }),
    db.comment.groupBy({
      by: ["postId"],
      where: { postId: { in: postIds }, status: "VISIBLE", authorId: { notIn: blockedUserIds } },
      _count: { _all: true },
    }),
  ]);

  const reactionCounts = new Map(reactionTotals.map((row) => [row.postId, row._count._all]));
  const commentCounts = new Map(commentTotals.map((row) => [row.postId, row._count._all]));
  const reactedPostIds = new Set(ownReactions.map((row) => row.postId));

  return rows.map((row) => {
    const content = { authorId: row.authorId, status: row.status };
    const actor = { userId, isGroupModerator };
    return {
      id: row.id,
      body: row.body,
      authorName: row.author.name,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      isPinned: row.isPinned,
      reactionCount: reactionCounts.get(row.id) ?? 0,
      viewerHasReacted: reactedPostIds.has(row.id),
      commentCount: commentCounts.get(row.id) ?? 0,
      isOwn: row.authorId === userId,
      canEdit: canEditOwnContent(content, userId),
      canRemove: canRemoveContent(content, actor),
      canPin: canPinPost({ groupId: row.groupId }, actor),
    };
  });
}

function isPostView(view: FeedPostView | undefined): view is FeedPostView {
  return view !== undefined;
}
