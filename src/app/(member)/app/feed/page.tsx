import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { FeedList } from "@/features/feed/components/feed-list";
import { PostComposer } from "@/features/feed/components/post-composer";
import { parseFeedCursor } from "@/features/feed/domain/feed-cursor";
import { listFeedPage } from "@/features/feed/services/feed-query.service";
import { REPORT_REASONS } from "@/features/reports/services/report.service";
import { ROUTES } from "@/constants/routes";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = {
  title: "Community feed",
  robots: { index: false, follow: false },
};

interface FeedPageProps {
  searchParams: Promise<{ before?: string | string[] }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const user = await requireActiveMember();
  const query = await searchParams;
  const before = parseFeedCursor(Array.isArray(query.before) ? query.before[0] : query.before);

  const page = await listFeedPage({ userId: user.id, groupId: null, before });
  if (!page) {
    notFound();
  }

  const olderHref = page.nextCursor
    ? `${ROUTES.appFeed}?before=${encodeURIComponent(page.nextCursor)}`
    : null;

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-2xl space-y-10">
        <SectionHeading
          as="h1"
          eyebrow="Community"
          title="Member feed"
          description="Updates from across the network. Share news, ask questions and celebrate milestones."
        />
        {page.canParticipate ? <PostComposer groupId={null} /> : null}
        <FeedList
          pinned={page.pinned}
          posts={page.posts}
          canParticipate={page.canParticipate}
          reportReasons={REPORT_REASONS}
          olderHref={olderHref}
          emptyTitle="No posts yet"
          emptyDescription="Be the first to share an update with the network."
        />
      </Container>
    </section>
  );
}
