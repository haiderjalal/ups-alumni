import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { BUSINESS_STATUS_LABELS } from "@/features/businesses/constants";
import { BusinessOwnerForm } from "@/features/businesses/components/business-owner-form";
import { BusinessSubmitForm } from "@/features/businesses/components/business-submit-form";
import { getPrimaryOwnedBusiness } from "@/features/businesses/services/business-owner.service";
import { listCollaborationRequestsForOwner } from "@/features/businesses/services/collaboration.service";
import { requireActiveMember } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Manage your business listing",
  robots: { index: false, follow: false },
};

export default async function ManageBusinessPage() {
  const user = await requireActiveMember();
  const business = await getPrimaryOwnedBusiness(user.id);
  const requests = business
    ? await listCollaborationRequestsForOwner(user.id, business.id)
    : [];

  const isLocked =
    business?.status === "PENDING_REVIEW" || business?.status === "CLOSED";
  const canSubmit =
    business?.status === "DRAFT" ||
    business?.status === "REJECTED" ||
    business?.status === "PUBLISHED";

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-12">
        <SectionHeading
          as="h1"
          eyebrow="Business directory"
          title="Your business listing"
          description={
            <p>
              Listings stay private until staff approve them. Changing a live
              listing hides it until the change is approved.
            </p>
          }
        />

        {business ? (
          <p
            role="status"
            className="rounded-xl border border-brand-border bg-brand-lilac px-4 py-3 text-sm text-brand-ink"
          >
            Status: <strong>{BUSINESS_STATUS_LABELS[business.status]}</strong>.
            Last updated {formatDateTime(business.updatedAt)}.
          </p>
        ) : null}

        <section aria-labelledby="listing-heading" className="space-y-6">
          <h2
            id="listing-heading"
            className="font-display text-2xl font-semibold"
          >
            Listing details
          </h2>
          <BusinessOwnerForm initial={business} locked={isLocked} />
        </section>

        {business && canSubmit ? (
          <section aria-labelledby="submit-heading" className="space-y-6">
            <h2
              id="submit-heading"
              className="font-display text-2xl font-semibold"
            >
              Submit for review
            </h2>
            <BusinessSubmitForm
              businessId={business.id}
              isPublished={business.status === "PUBLISHED"}
              publishContact={business.publishContact}
            />
          </section>
        ) : null}

        {business ? (
          <section aria-labelledby="messages-heading" className="space-y-6">
            <h2
              id="messages-heading"
              className="font-display text-2xl font-semibold"
            >
              Messages received
            </h2>
            {requests.length === 0 ? (
              <EmptyState
                title="No messages yet"
                description="When members send a collaboration message about your business, it appears here."
              />
            ) : (
              <ul className="space-y-4">
                {requests.map((request) => (
                  <li
                    key={request.id}
                    className="rounded-2xl border border-brand-border bg-brand-surface p-5"
                  >
                    <p className="text-sm text-brand-muted">
                      {request.requesterName} ·{" "}
                      {formatDateTime(request.createdAt)}
                    </p>
                    <p className="mt-3 whitespace-pre-line leading-relaxed break-words">
                      {request.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </Container>
    </section>
  );
}
