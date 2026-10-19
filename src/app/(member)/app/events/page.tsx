import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { EventList } from "@/features/events/components/event-list";
import { listMemberEvents } from "@/features/events/services/event-query.service";
import { loadEventViewer } from "@/features/events/services/event-viewer.service";
import { requireActiveMember } from "@/lib/session";

export const metadata: Metadata = {
  title: "Events",
  robots: { index: false, follow: false },
};

export default async function MemberEventsPage() {
  const user = await requireActiveMember();
  const viewer = await loadEventViewer(user.id);
  const [upcoming, past] = await Promise.all([
    listMemberEvents({ viewer, upcoming: true, limit: 50 }),
    listMemberEvents({ viewer, upcoming: false, limit: 20 }),
  ]);

  return (
    <section className="py-10 md:py-14">
      <Container className="space-y-14">
        <SectionHeading
          as="h1"
          eyebrow="Events"
          title="Member events"
          description="Reunions, networking sessions and online meetings. Every time shows its time zone."
        />

        <section aria-labelledby="upcoming-events-heading" className="space-y-4">
          <h2 id="upcoming-events-heading" className="font-display text-2xl font-semibold">
            Upcoming
          </h2>
          <EventList
            events={upcoming}
            emptyTitle="No upcoming events"
            emptyDescription="Reunions and sessions for members will appear here once they are published."
          />
        </section>

        {past.length > 0 ? (
          <section aria-labelledby="past-events-heading" className="space-y-4">
            <h2 id="past-events-heading" className="font-display text-2xl font-semibold">
              Past events
            </h2>
            <EventList events={past} emptyTitle="No past events" emptyDescription="" />
          </section>
        ) : null}
      </Container>
    </section>
  );
}
