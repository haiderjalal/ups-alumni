import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

import type { FeedPostView } from "../services/feed-query.service";

import { PostCard } from "./post-card";

interface FeedListProps {
  pinned: FeedPostView[];
  posts: FeedPostView[];
  canParticipate: boolean;
  reportReasons: readonly string[];
  /** Link to the next, older page. Null on the last page. */
  olderHref: string | null;
  emptyTitle: string;
  emptyDescription: string;
}

export function FeedList({
  pinned,
  posts,
  canParticipate,
  reportReasons,
  olderHref,
  emptyTitle,
  emptyDescription,
}: FeedListProps) {
  if (pinned.length === 0 && posts.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-8">
      {pinned.length > 0 ? (
        <section aria-labelledby="pinned-posts-heading" className="space-y-4">
          <h2 id="pinned-posts-heading" className="font-display text-xl font-semibold">
            Pinned
          </h2>
          {pinned.map((post) => (
            <PostCard key={post.id} post={post} canParticipate={canParticipate} reportReasons={reportReasons} />
          ))}
        </section>
      ) : null}

      {posts.length > 0 ? (
        <section aria-label="Latest posts" className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} canParticipate={canParticipate} reportReasons={reportReasons} />
          ))}
        </section>
      ) : null}

      {olderHref ? (
        <div className="flex justify-center">
          <Button variant="outline" render={<Link href={olderHref} />}>
            Load older posts
          </Button>
        </div>
      ) : null}
    </div>
  );
}
