import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { listNotifications } from "@/features/notifications/services/notification.service";
import { NotificationsMarkReadButton } from "@/features/notifications/components/notifications-mark-read-button";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id, 100);

  return (
    <section className="space-y-8">
      <Container className="max-w-3xl space-y-8 px-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading as="h1" eyebrow="Inbox" title="Notifications" />
          <NotificationsMarkReadButton disabled={items.every((item) => item.readAt !== null)} />
        </div>

        {items.length === 0 ? (
          <EmptyState title="No notifications" description="Updates about your application, payment, connections and events will appear here." />
        ) : (
          <ul className="divide-y divide-brand-border rounded-2xl border border-brand-border bg-brand-surface">
            {items.map((item) => (
              <li key={item.id} className="space-y-1 px-5 py-4">
                <p className="flex items-center gap-2 font-semibold">
                  {item.readAt === null ? <span className="inline-block size-2 rounded-full bg-brand-gold" aria-label="Unread" /> : null}
                  {item.title}
                </p>
                <p className="text-sm leading-relaxed text-brand-muted">{item.body}</p>
                <p className="text-xs text-brand-muted">{formatDateTime(item.createdAt)}</p>
                {item.linkPath ? (
                  <a className="text-sm font-semibold text-brand-deep underline underline-offset-4" href={item.linkPath}>
                    Open
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}
