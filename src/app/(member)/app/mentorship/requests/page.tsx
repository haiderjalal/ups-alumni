import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { MentorshipRequestActions } from "@/features/mentorship/components/mentorship-request-actions";
import { PREFERRED_FORMAT_LABELS } from "@/features/mentorship/constants";
import { listMentorshipActivity } from "@/features/mentorship/services/mentorship.service";
import { requireActiveMember } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/time";

import type { PreferredFormat } from "@/features/mentorship/domain/mentorship-rules";

export const metadata: Metadata = {
  title: "Mentorship requests",
  robots: { index: false, follow: false },
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: "Waiting for a decision",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
};

const MENTORSHIP_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function MentorshipRequestsPage() {
  const user = await requireActiveMember();
  const activity = await listMentorshipActivity(user.id);

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-12">
        <SectionHeading
          as="h1"
          eyebrow="Mentorship"
          title="Your requests and mentorships"
          description={
            <p>
              Track requests you have received and sent, and the mentorships you
              are part of.
            </p>
          }
        />

        <section aria-labelledby="incoming-heading" className="space-y-4">
          <h2
            id="incoming-heading"
            className="font-display text-2xl font-semibold"
          >
            Requests for you
          </h2>
          {activity.incoming.length === 0 ? (
            <EmptyState
              title="No pending requests"
              description="New requests from members appear here for your decision."
            />
          ) : (
            <ul className="space-y-4">
              {activity.incoming.map((request) => (
                <li
                  key={request.id}
                  className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-5"
                >
                  <div className="space-y-1">
                    <p className="font-semibold break-words">
                      {request.menteeName}
                    </p>
                    <p className="text-sm text-brand-muted">
                      {PREFERRED_FORMAT_LABELS[
                        request.preferredFormat as PreferredFormat
                      ] ?? request.preferredFormat}{" "}
                      · {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed break-words">
                    {request.goal}
                  </p>
                  <MentorshipRequestActions
                    variant="incoming"
                    requestId={request.id}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="outgoing-heading" className="space-y-4">
          <h2
            id="outgoing-heading"
            className="font-display text-2xl font-semibold"
          >
            Requests you sent
          </h2>
          {activity.outgoing.length === 0 ? (
            <EmptyState
              title="No requests sent"
              description="Find a mentor in the mentorship directory to send a request."
            />
          ) : (
            <ul className="space-y-3">
              {activity.outgoing.map((request) => (
                <li
                  key={request.id}
                  className="flex min-w-0 flex-col gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5"
                >
                  <div className="space-y-1">
                    <p className="font-semibold break-words">
                      {request.mentorName}
                    </p>
                    <p className="text-sm text-brand-muted">
                      {REQUEST_STATUS_LABELS[request.status] ?? request.status}{" "}
                      · sent {formatDate(request.createdAt)}
                    </p>
                  </div>
                  {request.status === "PENDING" ? (
                    <MentorshipRequestActions
                      variant="outgoing"
                      requestId={request.id}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="mentorships-heading" className="space-y-4">
          <h2
            id="mentorships-heading"
            className="font-display text-2xl font-semibold"
          >
            Your mentorships
          </h2>
          {activity.mentorships.length === 0 ? (
            <EmptyState
              title="No mentorships yet"
              description="An accepted request starts a mentorship, shown here."
            />
          ) : (
            <ul className="space-y-3">
              {activity.mentorships.map((mentorship) => (
                <li
                  key={mentorship.id}
                  className="flex min-w-0 flex-col gap-3 rounded-2xl border border-brand-border bg-brand-surface p-5"
                >
                  <div className="space-y-1">
                    <p className="font-semibold break-words">
                      {mentorship.role === "MENTOR" ? "Mentee" : "Mentor"}:{" "}
                      {mentorship.partnerName}
                    </p>
                    <p className="text-sm text-brand-muted">
                      {MENTORSHIP_STATUS_LABELS[mentorship.status] ??
                        mentorship.status}{" "}
                      · started {formatDateTime(mentorship.startedAt)}
                      {mentorship.endedAt
                        ? ` · ended ${formatDateTime(mentorship.endedAt)}`
                        : ""}
                    </p>
                  </div>
                  {mentorship.status === "ACTIVE" ? (
                    <MentorshipRequestActions
                      variant="active"
                      mentorshipId={mentorship.id}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </section>
  );
}
