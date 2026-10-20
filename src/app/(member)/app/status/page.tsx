import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, Clock } from "lucide-react";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { ELIGIBILITY_GAP_MESSAGES } from "@/features/membership/domain/eligibility";
import { getMembershipOverview } from "@/features/membership/services/eligibility.service";
import { getPaymentOverview } from "@/features/payments/services/order.service";
import { loadOnboardingSnapshot } from "@/features/registration/services/onboarding.service";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Your membership status", robots: { index: false, follow: false } };

const APPLICATION_LABELS: Record<string, string> = {
  DRAFT: "In progress",
  SUBMITTED: "Submitted, waiting for review",
  UNDER_REVIEW: "Under alumni review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  REJECTED: "Not approved",
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  CLOSED: "Closed",
};

function StatusRow({ done, title, detail }: { done: boolean; title: string; detail: string }) {
  const Icon = done ? CheckCircle2 : Clock;
  return (
    <li className="flex gap-4 py-5">
      <Icon aria-hidden="true" className={done ? "mt-1 size-5 shrink-0 text-brand-success" : "mt-1 size-5 shrink-0 text-brand-violet"} />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm leading-relaxed text-brand-muted">{detail}</p>
      </div>
    </li>
  );
}

/** Each requirement is shown separately. Receipts and approvals alone never mean membership is active. */
export default async function StatusPage() {
  const user = await requireUser();
  const [onboarding, membership, payment] = await Promise.all([
    loadOnboardingSnapshot(user.id),
    getMembershipOverview(user.id),
    getPaymentOverview(user.id),
  ]);

  const applicationStatus = onboarding?.application.status ?? "DRAFT";
  const feeConfirmed = payment.order?.status === "CONFIRMED" || payment.order?.status === "REFUNDED";
  const membershipStatus = membership.membershipStatus ?? "PENDING";
  const isActive = membershipStatus === "ACTIVE";

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-10 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Your status"
          title={isActive ? "You are an active member" : "Your membership is in progress"}
          description="Membership needs four things: a verified email, an approved alumni application, a confirmed registration fee, and an active membership record."
        />

        <ul className="divide-y divide-brand-border border-y border-brand-border">
          <StatusRow
            done={payment.emailVerified}
            title="Email verified"
            detail={payment.emailVerified ? "Your email address is verified." : "Open the verification link we sent to your inbox."}
          />
          <StatusRow
            done={applicationStatus === "APPROVED"}
            title={`Alumni application: ${APPLICATION_LABELS[applicationStatus] ?? applicationStatus}`}
            detail={
              onboarding?.application.decisionReason
                ? `Reviewer note: ${onboarding.application.decisionReason}`
                : onboarding?.application.submittedAt
                  ? `Submitted ${formatDate(onboarding.application.submittedAt)}.`
                  : "Complete the registration steps, then submit."
            }
          />
          <StatusRow
            done={feeConfirmed}
            title={`Registration fee: ${feeConfirmed ? "confirmed" : payment.order ? "awaiting confirmation" : "not paid yet"}`}
            detail={
              feeConfirmed
                ? "Your transfer has been confirmed against the receiving-account statement."
                : "Payment confirmation is separate from alumni approval. Submit your transfer evidence on the payment page."
            }
          />
          <StatusRow
            done={isActive}
            title={`Membership: ${MEMBERSHIP_LABELS[membershipStatus] ?? membershipStatus}`}
            detail={
              isActive
                ? "You can use the directory, batches, events and community spaces."
                : "Membership activates automatically once every requirement above is complete."
            }
          />
        </ul>

        {!isActive && membership.result.gaps.length > 0 ? (
          <section aria-labelledby="next-heading" className="space-y-4 rounded-2xl border border-brand-border bg-brand-surface p-6">
            <h2 id="next-heading" className="font-display text-2xl font-semibold">
              What is still needed
            </h2>
            <ul className="space-y-2">
              {membership.result.gaps.map((gap) => (
                <li key={gap} className="flex gap-3 text-brand-muted">
                  <Circle aria-hidden="true" className="mt-1.5 size-3 shrink-0 text-brand-violet" />
                  <span>{ELIGIBILITY_GAP_MESSAGES[gap]}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              {applicationStatus === "DRAFT" || applicationStatus === "CHANGES_REQUESTED" ? (
                <Button render={<Link href={ROUTES.appOnboarding} />}>Continue your registration</Button>
              ) : null}
              <Button variant="outline" render={<Link href={ROUTES.appPayment} />}>
                Go to payment
              </Button>
            </div>
          </section>
        ) : null}
      </Container>
    </section>
  );
}
