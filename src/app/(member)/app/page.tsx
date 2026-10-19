import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { listPublicEvents } from "@/features/events/services/public-events.service";
import { getApplicationGaps } from "@/features/registration/domain/completeness";
import { loadApplicationSnapshot } from "@/features/registration/services/application-snapshot.service";
import { countUnreadNotifications, listNotifications } from "@/features/notifications/services/notification.service";
import { db } from "@/lib/db";
import { requireActiveMember } from "@/lib/session";
import { currentYearInZone, formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

/** Number of items the completeness score counts. Matches the required fields in the completeness rule. */
const COMPLETENESS_ITEMS = 11;

/** Dashboard for active members. Pending applicants are redirected to their status page by the guard. */
export default async function DashboardPage() {
  const user = await requireActiveMember();
  const [membership, profile, unread, notifications, upcomingEvents, applicationSnapshot] = await Promise.all([
    db.membership.findUnique({ where: { userId: user.id }, select: { cardId: true, activatedAt: true } }),
    db.alumniProfile.findUnique({ where: { userId: user.id }, select: { matricYear: true, currentCity: true } }),
    countUnreadNotifications(user.id),
    listNotifications(user.id, 4),
    listPublicEvents({ upcoming: true, limit: 3 }),
    loadApplicationSnapshot(db, user.id),
  ]);

  const gaps = getApplicationGaps(applicationSnapshot, currentYearInZone());
  const completion = Math.round(((COMPLETENESS_ITEMS - Math.min(gaps.length, COMPLETENESS_ITEMS)) / COMPLETENESS_ITEMS) * 100);

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading as="h1" eyebrow={SITE.verificationLabel} title={`Welcome back, ${user.name.split(" ")[0] ?? user.name}`} />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article aria-labelledby="card-heading" className="relative overflow-hidden rounded-[1.25rem] bg-brand-deep p-7 text-white">
            <p id="card-heading" className="text-sm uppercase tracking-[0.14em] text-white/75">
              Digital membership card
            </p>
            <p className="mt-6 font-display text-3xl font-semibold">{user.name}</p>
            <p className="text-white/85">
              {profile?.matricYear ? `Batch ${profile.matricYear}` : "Batch not set"}
              {profile?.currentCity ? ` · ${profile.currentCity}` : ""}
            </p>
            <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-white/65">Card number</dt>
                <dd className="font-mono tracking-wider">{membership?.cardId}</dd>
              </div>
              <div>
                <dt className="text-white/65">Active since</dt>
                <dd>{membership?.activatedAt ? formatDateTime(membership.activatedAt) : "Not recorded"}</dd>
              </div>
            </dl>
            <p className="mt-6 text-xs text-white/65">
              Share your card number only with people you trust. The card does not include contact details.
            </p>
          </article>

          <div className="space-y-6">
            <article aria-labelledby="completion-heading" className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
              <h2 id="completion-heading" className="font-display text-2xl font-semibold">
                Profile completeness
              </h2>
              <div
                className="h-3 overflow-hidden rounded-full bg-brand-sage"
                role="progressbar"
                aria-valuenow={completion}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profile completeness"
              >
                <div className="h-full bg-brand-deep transition-[width] duration-200" style={{ width: `${completion}%` }} />
              </div>
              <p className="text-sm text-brand-muted">{completion}% of the essential profile is complete.</p>
              <Button variant="outline" render={<Link href={ROUTES.appProfile} />}>
                Update your profile
              </Button>
            </article>

            <article aria-labelledby="notif-heading" className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="notif-heading" className="font-display text-2xl font-semibold">
                  Notifications
                </h2>
                {unread > 0 ? (
                  <span className="rounded-full bg-brand-gold px-3 py-1 text-sm font-semibold text-brand-forest">{unread} unread</span>
                ) : null}
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-brand-muted">Nothing new yet.</p>
              ) : (
                <ul className="divide-y divide-brand-border">
                  {notifications.map((item) => (
                    <li key={item.id} className="py-3">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-brand-muted">{formatDateTime(item.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="ghost" render={<Link href={ROUTES.appNotifications} />}>
                All notifications
              </Button>
            </article>
          </div>
        </div>

        <section aria-labelledby="events-heading" className="space-y-5">
          <h2 id="events-heading" className="font-display text-3xl font-semibold">
            Upcoming public events
          </h2>
          {upcomingEvents.length === 0 ? (
            <EmptyState title="No events scheduled" description="Member events and reunions will appear here as they are published." />
          ) : (
            <ul className="divide-y divide-brand-border border-y border-brand-border">
              {upcomingEvents.map((event) => (
                <li key={event.slug}>
                  <Link href={`${ROUTES.events}/${event.slug}`} className="flex flex-col gap-1 py-4 hover:text-brand-deep sm:flex-row sm:justify-between">
                    <span className="font-semibold">{event.title}</span>
                    <span className="text-sm text-brand-muted">{formatDateTime(event.startsAt, event.timezone)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </section>
  );
}
