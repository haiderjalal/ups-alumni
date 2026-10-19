import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ApplicationDecisionForm } from "@/features/admin/components/decision-forms";
import { getApplicationForReview } from "@/features/admin/services/application-admin.service";
import { APPLICATION_GAP_MESSAGES } from "@/features/registration/services/onboarding.service";
import { requireStaffRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Review application", robots: { index: false, follow: false } };

interface ReviewPageProps {
  params: Promise<{ userId: string }>;
}

/**
 * Full application for membership staff. Private school details (roll number, school memory) are shown here
 * because this role verifies identity; they are never shown in directories or to other members.
 */
export default async function ReviewApplicationPage({ params }: ReviewPageProps) {
  await requireStaffRole(["MEMBERSHIP_ADMIN"]);
  const { userId } = await params;
  const application = await getApplicationForReview(userId);
  if (!application) {
    notFound();
  }

  const profile = application.user.profile;
  const latestOrder = application.user.orders[0];
  const hasConfirmedFee = latestOrder?.status === "CONFIRMED" || latestOrder?.status === "REFUNDED";
  const editable = application.status === "SUBMITTED" || application.status === "UNDER_REVIEW" || application.status === "CHANGES_REQUESTED";

  return (
    <section className="space-y-10">
      <Container className="max-w-none space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow={`Application · ${application.status.replace(/_/g, " ").toLowerCase()}`}
          title={application.user.name}
          description={`Email ${application.user.email} · ${application.user.emailVerified ? "email verified" : "email not verified"} · Membership ${application.user.membership?.status ?? "not set"}`}
        />

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <dl className="grid gap-5 rounded-2xl border border-brand-border bg-brand-surface p-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold text-brand-muted">Matric year</dt>
                <dd>{profile?.matricYear ?? "Not set"}{profile?.batchReviewRequested ? " · manual review requested" : ""}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-muted">Batch note from applicant</dt>
                <dd className="whitespace-pre-line">{profile?.batchReviewNote ?? "None"}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-muted">Location</dt>
                <dd>{[profile?.currentCity, profile?.currentCountry].filter(Boolean).join(", ") || "Not set"}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-muted">Phone</dt>
                <dd>{profile?.phoneE164 ?? "Not given"}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-muted">Status</dt>
                <dd>{profile?.professionalStatuses.map((status) => status.replace(/_/g, " ").toLowerCase()).join(", ") || "Not given"}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-muted">Job or institution</dt>
                <dd>{[profile?.jobTitle, profile?.organization, profile?.institution].filter(Boolean).join(" · ") || "Not given"}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-muted">School years</dt>
                <dd>{[profile?.schoolJoinYear, profile?.schoolLeaveYear].filter(Boolean).join(" to ") || "Not given"}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-brand-muted">Section, house, roll number</dt>
                <dd>{[profile?.section, profile?.house, profile?.rollNumber].filter(Boolean).join(" · ") || "Not given"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-brand-muted">School memory (aid only, not proof of identity)</dt>
                <dd className="whitespace-pre-line">{profile?.schoolMemory ?? "None"}</dd>
              </div>
            </dl>

            <section aria-labelledby="history-heading" className="space-y-4">
              <h2 id="history-heading" className="font-display text-2xl font-semibold">Review history</h2>
              {application.reviews.length === 0 ? (
                <p className="text-brand-muted">No decisions or notes yet.</p>
              ) : (
                <ul className="divide-y divide-brand-border rounded-xl border border-brand-border bg-brand-surface">
                  {application.reviews.map((review) => (
                    <li key={review.id} className="space-y-1 px-5 py-4">
                      <p className="font-semibold">{review.action.replace(/_/g, " ").toLowerCase()} · {review.reviewer.name}</p>
                      <p className="text-sm text-brand-muted">{formatDateTime(review.createdAt)}</p>
                      {review.note ? <p className="whitespace-pre-line text-sm">{review.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <section aria-labelledby="gaps-heading" className="space-y-3 rounded-2xl border border-brand-border bg-brand-surface p-6">
              <h2 id="gaps-heading" className="font-display text-2xl font-semibold">Completeness</h2>
              {application.gaps.length === 0 ? (
                <p className="text-sm text-brand-success">All required fields are complete.</p>
              ) : (
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {application.gaps.map((gap) => (
                    <li key={gap}>{APPLICATION_GAP_MESSAGES[gap]}</li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-brand-muted">
                Fee: {latestOrder ? `${latestOrder.reference} · ${latestOrder.status.replace(/_/g, " ").toLowerCase()}` : "no payment reference yet"}
              </p>
            </section>

            <section aria-labelledby="decide-heading" className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
              <h2 id="decide-heading" className="font-display text-2xl font-semibold">Decide</h2>
              {editable ? (
                <ApplicationDecisionForm userId={userId} expectedVersion={application.version} hasConfirmedFee={hasConfirmedFee} />
              ) : (
                <p className="text-sm text-brand-muted">This application is {application.status.replace(/_/g, " ").toLowerCase()}. Decisions are final unless a super administrator reopens it.</p>
              )}
            </section>
          </aside>
        </div>
      </Container>
    </section>
  );
}
