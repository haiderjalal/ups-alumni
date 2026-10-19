import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { listPublicEvents } from "@/features/events/services/public-events.service";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Events",
  description: "Published public events from the UPS Alumni Network.",
};
export const revalidate = 300;

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([
    listPublicEvents({ upcoming: true, limit: 24 }),
    listPublicEvents({ upcoming: false, limit: 12 }),
  ]);

  return (
    <section className="py-16 md:py-24">
      <Container className="space-y-16">
        <SectionHeading
          as="h1"
          eyebrow="Events"
          title="Gatherings and reunions"
          description="Public events are listed here. Member-only events and virtual meeting links appear after you join."
        />

        <div className="space-y-6">
          <h2 className="font-display text-3xl font-semibold">Upcoming</h2>
          {upcoming.length === 0 ? (
            <EmptyState
              title="No public events are scheduled yet"
              description="Reunions and networking sessions will be listed here once they are published. Join the network to hear about member events first."
              action={
                <Button render={<Link href={ROUTES.register} />}>Join the Network</Button>
              }
            />
          ) : (
            <ul className="divide-y divide-brand-border border-y border-brand-border">
              {upcoming.map((event) => (
                <li key={event.slug}>
                  <Link
                    href={`${ROUTES.events}/${event.slug}`}
                    className="flex flex-col gap-2 py-6 transition-colors duration-200 hover:text-brand-deep sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-display text-2xl font-semibold">{event.title}</span>
                    <span className="text-sm text-brand-muted">
                      {formatDateTime(event.startsAt, event.timezone)}
                      {event.locationText ? ` · ${event.locationText}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {past.length > 0 ? (
          <div className="space-y-6">
            <h2 className="font-display text-3xl font-semibold">Past events</h2>
            <ul className="divide-y divide-brand-border border-y border-brand-border">
              {past.map((event) => (
                <li key={event.slug}>
                  <Link
                    href={`${ROUTES.events}/${event.slug}`}
                    className="flex flex-col gap-1 py-5 transition-colors duration-200 hover:text-brand-deep sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-semibold">{event.title}</span>
                    <span className="text-sm text-brand-muted">{formatDateTime(event.startsAt, event.timezone)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
