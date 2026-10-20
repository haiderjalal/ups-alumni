import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { getPublicEventBySlug } from "@/features/events/services/public-events.service";
import { formatDateTime } from "@/lib/time";

export const revalidate = 300;

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  return event ? { title: event.title, description: event.description.slice(0, 160) } : { title: "Event not found" };
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) {
    notFound();
  }

  return (
    <section className="py-16 md:py-24">
      <Container className="max-w-3xl space-y-10">
        <SectionHeading
          as="h1"
          eyebrow="Event"
          title={event.title}
          description={
            <p>
              {formatDateTime(event.startsAt, event.timezone)}
              {event.endsAt ? ` to ${formatDateTime(event.endsAt, event.timezone)}` : ""}
              {event.locationText ? ` · ${event.locationText}` : ""}
            </p>
          }
        />
        <div className="whitespace-pre-line text-lg leading-relaxed text-brand-muted">{event.description}</div>
        <div className="rounded-2xl bg-brand-lilac p-6">
          <p className="text-brand-ink">
            Members receive registration links and any virtual meeting details. Sign in or join to RSVP.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button render={<Link href={ROUTES.register} />}>Join the Network</Button>
            <Button variant="outline" render={<Link href={ROUTES.events} />}>
              All events
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
