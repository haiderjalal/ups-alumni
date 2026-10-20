import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { AttendanceRoster, type AttendanceRow } from "@/features/events/components/attendance-roster";
import { RsvpControls } from "@/features/events/components/rsvp-controls";
import { rsvpPrompt } from "@/features/events/domain/rsvp-rules";
import { getMemberEventDetail } from "@/features/events/services/event-query.service";
import { loadEventViewer } from "@/features/events/services/event-viewer.service";
import { ROUTES } from "@/constants/routes";
import { requireActiveMember } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Event",
  robots: { index: false, follow: false },
};

interface MemberEventPageProps {
  params: Promise<{ slug: string }>;
}

const AUDIENCE_LABELS = {
  PUBLIC: "Public event",
  MEMBERS: "Members only",
  BATCH: "Batch only",
} as const;

export default async function MemberEventPage({ params }: MemberEventPageProps) {
  const user = await requireActiveMember();
  const { slug } = await params;
  const viewer = await loadEventViewer(user.id);
  const event = await getMemberEventDetail({ slug, viewer });
  if (!event) {
    notFound();
  }

  const viewerRsvp = event.viewerStatus === "GOING" || event.viewerStatus === "WAITLISTED" ? event.viewerStatus : null;
  const prompt = rsvpPrompt({
    eventOpen: event.canRegister,
    viewerStatus: viewerRsvp,
    capacity: event.capacity,
    goingCount: event.goingCount,
    deadline: event.effectiveDeadline,
    now: new Date(),
  });
  const deadlineLabel = formatDateTime(event.effectiveDeadline, event.timezone);
  const attendanceRows: AttendanceRow[] = (event.roster ?? []).flatMap((row) =>
    row.status === "GOING" || row.status === "WAITLISTED"
      ? [{ userId: row.userId, name: row.name, status: row.status, attended: row.attendedAt !== null }]
      : [],
  );
  const calendarHref = `${ROUTES.appEvents}/${event.slug}/calendar.ics`;

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-12">
        <SectionHeading
          as="h1"
          eyebrow={AUDIENCE_LABELS[event.visibility]}
          title={event.title}
          description={
            <dl className="grid gap-4 text-base sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold text-brand-ink">When</dt>
                <dd>
                  {formatDateTime(event.startsAt, event.timezone)}
                  {event.endsAt ? ` to ${formatDateTime(event.endsAt, event.timezone)}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-ink">Where</dt>
                <dd className="break-words">{event.locationText ?? "Location not listed"}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-ink">Organizer</dt>
                <dd className="break-words">{event.organizerName}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-ink">Seats</dt>
                <dd>
                  {event.goingCount} going
                  {event.capacity ? ` of ${event.capacity}` : ""}
                  {event.waitlistCount > 0 ? `, ${event.waitlistCount} on the waitlist` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-ink">RSVP closes</dt>
                <dd>{deadlineLabel}</dd>
              </div>
              {event.batchYear ? (
                <div>
                  <dt className="text-sm font-semibold text-brand-ink">Batch</dt>
                  <dd>Batch {event.batchYear}</dd>
                </div>
              ) : null}
            </dl>
          }
        />

        <div className="whitespace-pre-line break-words text-lg leading-relaxed text-brand-muted">{event.description}</div>

        {event.status !== "PUBLISHED" ? (
          <p role="status" className="rounded-xl border border-brand-border bg-brand-lilac p-4 text-brand-ink">
            This event is {event.status === "DRAFT" ? "a draft and is not visible to members yet" : "cancelled"}.
          </p>
        ) : null}

        <div className="space-y-6 rounded-2xl bg-brand-lilac p-6">
          <RsvpControls slug={event.slug} prompt={prompt} viewerStatus={viewerRsvp} deadlineLabel={deadlineLabel} />
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" render={<a href={calendarHref} download />}>
              Add to calendar (.ics)
            </Button>
            {event.virtualUrl ? (
              <Button variant="outline" render={<a href={event.virtualUrl} rel="noopener noreferrer" target="_blank" />}>
                Join online
              </Button>
            ) : null}
          </div>
          {event.virtualUrl ? (
            <p className="text-sm text-brand-muted">The online link is shared only with people going to this event.</p>
          ) : null}
        </div>

        {event.canManage && event.roster ? (
          <section aria-labelledby="attendance-heading" className="space-y-4">
            <h2 id="attendance-heading" className="font-display text-2xl font-semibold">
              Attendance
            </h2>
            <p className="text-sm text-brand-muted">
              {attendanceRows.filter((row) => row.attended).length} marked attended of{" "}
              {attendanceRows.filter((row) => row.status === "GOING").length} going.
            </p>
            <AttendanceRoster eventId={event.id} rows={attendanceRows} />
          </section>
        ) : null}
      </Container>
    </section>
  );
}
