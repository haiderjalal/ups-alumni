import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { GroupList } from "@/features/groups/components/group-list";
import { listGroupsForViewer } from "@/features/groups/services/group-query.service";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = {
  title: "Groups",
  robots: { index: false, follow: false },
};

export default async function GroupsPage() {
  const user = await requireActiveMember();
  const groups = await listGroupsForViewer(user.id);
  const joined = groups.filter((group) => group.viewerStatus === "ACTIVE");
  const others = groups.filter((group) => group.viewerStatus !== "ACTIVE");

  return (
    <section className="py-10 md:py-14">
      <Container className="space-y-14">
        <SectionHeading
          as="h1"
          eyebrow="Community"
          title="Groups"
          description="Batch, profession, chapter and interest groups. Some groups review join requests before admitting members."
        />
        <GroupList
          heading="Your groups"
          groups={joined}
          emptyTitle="You have not joined a group yet"
          emptyDescription="Join a group below to see its posts and members."
        />
        <GroupList
          heading="All groups"
          groups={others}
          emptyTitle="No other groups are available"
          emptyDescription="New groups appear here when they are created."
        />
      </Container>
    </section>
  );
}
