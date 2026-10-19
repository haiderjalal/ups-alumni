import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { GroupJoinControl } from "@/features/groups/components/group-join-control";
import { GroupMemberList } from "@/features/groups/components/group-member-list";
import { GroupModerationPanel } from "@/features/groups/components/group-moderation-panel";
import { GROUP_KIND_LABELS, JOIN_POLICY_LABELS } from "@/features/groups/components/group-labels";
import {
  getGroupForViewer,
  listActiveGroupMembers,
  listPendingRequests,
} from "@/features/groups/services/group-query.service";
import { FeedList } from "@/features/feed/components/feed-list";
import { PostComposer } from "@/features/feed/components/post-composer";
import { parseFeedCursor } from "@/features/feed/domain/feed-cursor";
import { listFeedPage } from "@/features/feed/services/feed-query.service";
import { REPORT_REASONS } from "@/features/reports/services/report.service";
import { ROUTES } from "@/constants/routes";
import { requireActiveMember } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Group",
  robots: { index: false, follow: false },
};

interface GroupPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ before?: string | string[] }>;
}

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const user = await requireActiveMember();
  const { slug } = await params;
  const query = await searchParams;
  const before = parseFeedCursor(Array.isArray(query.before) ? query.before[0] : query.before);

  const group = await getGroupForViewer(slug, user.id);
  if (!group) {
    notFound();
  }

  const isActiveMember = group.viewerStatus === "ACTIVE";
  const [feed, members, pending] = await Promise.all([
    listFeedPage({ userId: user.id, groupId: group.id, before }),
    isActiveMember || group.isModerator ? listActiveGroupMembers(group.id, user.id) : Promise.resolve(null),
    group.isModerator ? listPendingRequests(group.id) : Promise.resolve(null),
  ]);
  if (!feed) {
    notFound();
  }

  const olderHref = feed.nextCursor
    ? `${ROUTES.appGroups}/${group.slug}?before=${encodeURIComponent(feed.nextCursor)}`
    : null;

  return (
    <section className="py-10 md:py-14">
      <Container className="space-y-14">
        <div className="max-w-3xl space-y-6">
          <SectionHeading
            as="h1"
            eyebrow={GROUP_KIND_LABELS[group.kind]}
            title={group.name}
            description={
              <div className="space-y-2">
                <p className="whitespace-pre-line break-words">{group.description}</p>
                <p className="text-sm">
                  {group.memberCount} {group.memberCount === 1 ? "member" : "members"} ·{" "}
                  {JOIN_POLICY_LABELS[group.joinPolicy]}
                  {group.isPrivate ? " · Private group" : ""}
                </p>
              </div>
            }
          />
          <GroupJoinControl
            groupId={group.id}
            groupName={group.name}
            joinPolicy={group.joinPolicy}
            viewerStatus={group.viewerStatus}
          />
        </div>

        {group.isModerator && members && pending ? (
          <section aria-labelledby="moderation-heading" className="space-y-5">
            <h2 id="moderation-heading" className="font-display text-3xl font-semibold">
              Moderation
            </h2>
            <GroupModerationPanel
              groupId={group.id}
              viewerUserId={user.id}
              pending={pending.map((request) => ({
                userId: request.userId,
                name: request.name,
                requestedLabel: formatDateTime(request.requestedAt),
              }))}
              members={members.map((member) => ({
                userId: member.userId,
                name: member.name,
                isModerator: member.role === "MODERATOR",
              }))}
            />
          </section>
        ) : null}

        {isActiveMember && members && !group.isModerator ? (
          <section aria-labelledby="members-heading" className="space-y-5">
            <h2 id="members-heading" className="font-display text-3xl font-semibold">
              Members
            </h2>
            <GroupMemberList members={members} />
          </section>
        ) : null}

        <section aria-labelledby="group-posts-heading" className="space-y-6">
          <h2 id="group-posts-heading" className="font-display text-3xl font-semibold">
            Posts
          </h2>
          {feed.canParticipate ? (
            <PostComposer groupId={group.id} />
          ) : (
            <p className="text-brand-muted">
              {group.viewerStatus === "PENDING"
                ? "Your request is waiting for review. You can post here once it is approved."
                : "Join this group to post, comment and react."}
            </p>
          )}
          <FeedList
            pinned={feed.pinned}
            posts={feed.posts}
            canParticipate={feed.canParticipate}
            reportReasons={REPORT_REASONS}
            olderHref={olderHref}
            emptyTitle="No posts yet"
            emptyDescription="Posts from this group will appear here."
          />
        </section>
      </Container>
    </section>
  );
}
