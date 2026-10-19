import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/time";

import type { FeedPostView } from "../services/feed-query.service";

import { CommentThread } from "./comment-thread";
import { PostMenu } from "./post-menu";
import { ReactionButton } from "./reaction-button";

interface PostCardProps {
  post: FeedPostView;
  canParticipate: boolean;
  reportReasons: readonly string[];
}

/** Server-rendered post. Interactive parts are small client components that receive only what they need. */
export function PostCard({ post, canParticipate, reportReasons }: PostCardProps) {
  return (
    <article className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-5 sm:p-6">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-muted">
        <span className="break-words font-semibold text-brand-ink">{post.authorName}</span>
        <time dateTime={post.createdAt.toISOString()}>{formatDateTime(post.createdAt)}</time>
        {post.isPinned ? <Badge variant="secondary">Pinned</Badge> : null}
        {post.editedAt ? <span>· Edited</span> : null}
      </header>
      <p className="whitespace-pre-line break-words leading-relaxed text-brand-ink">{post.body}</p>
      <div className="flex flex-wrap items-start gap-3">
        <ReactionButton
          postId={post.id}
          reactionCount={post.reactionCount}
          viewerHasReacted={post.viewerHasReacted}
          disabled={!canParticipate}
        />
        <CommentThread
          postId={post.id}
          commentCount={post.commentCount}
          canParticipate={canParticipate}
          reportReasons={reportReasons}
        />
      </div>
      <PostMenu
        postId={post.id}
        body={post.body}
        isOwn={post.isOwn}
        canEdit={post.canEdit}
        canRemove={post.canRemove}
        canPin={post.canPin}
        isPinned={post.isPinned}
        reportReasons={reportReasons}
      />
    </article>
  );
}
