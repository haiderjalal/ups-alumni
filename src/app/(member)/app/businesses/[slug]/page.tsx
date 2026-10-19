import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { BUSINESS_STATUS_LABELS } from "@/features/businesses/constants";
import { CollaborationRequestForm } from "@/features/businesses/components/collaboration-request-form";
import {
  getBusinessDetailForViewer,
  type CollaborationAvailability,
} from "@/features/businesses/services/business-directory.service";
import { requireActiveMember } from "@/lib/session";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Alumni business",
  robots: { index: false, follow: false },
};

interface BusinessDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BusinessDetailPage({
  params,
}: BusinessDetailPageProps) {
  const user = await requireActiveMember();
  const { slug } = await params;
  const business = await getBusinessDetailForViewer(slug, user.id);
  if (!business) {
    notFound();
  }

  const isPublished = business.status === "PUBLISHED";

  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-3xl space-y-10">
        <Link
          href={ROUTES.appBusinesses}
          className="inline-block text-sm font-semibold text-brand-deep underline underline-offset-4"
        >
          Back to businesses
        </Link>

        {business.isOwner && !isPublished ? (
          <p
            role="status"
            className="rounded-xl border border-brand-border bg-brand-sage px-4 py-3 text-sm text-brand-ink"
          >
            Owner preview. This listing is{" "}
            {BUSINESS_STATUS_LABELS[business.status].toLowerCase()} and only you
            can see it.
          </p>
        ) : null}

        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-gold-text break-words">
            {business.sector} · {business.city}
          </p>
          <h1 className="font-display text-4xl font-semibold leading-tight break-words">
            {business.name}
          </h1>
        </header>

        <section aria-labelledby="about-heading" className="space-y-3">
          <h2
            id="about-heading"
            className="font-display text-2xl font-semibold"
          >
            About
          </h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-brand-muted break-words">
            {business.description}
          </p>
        </section>

        <section aria-labelledby="products-heading" className="space-y-3">
          <h2
            id="products-heading"
            className="font-display text-2xl font-semibold"
          >
            Products and services
          </h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-brand-muted break-words">
            {business.productsServices}
          </p>
        </section>

        <section aria-labelledby="contact-heading" className="space-y-3">
          <h2
            id="contact-heading"
            className="font-display text-2xl font-semibold"
          >
            Contact
          </h2>
          {business.websiteUrl ? (
            <p className="break-all text-base">
              Website:{" "}
              <a
                href={business.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-semibold text-brand-deep underline underline-offset-4"
              >
                {business.websiteUrl}
              </a>
            </p>
          ) : null}
          {business.contact ? (
            <ul className="space-y-1 text-base break-words">
              {business.contact.email ? (
                <li>Email: {business.contact.email}</li>
              ) : null}
              {business.contact.phone ? (
                <li>Phone: {business.contact.phone}</li>
              ) : null}
            </ul>
          ) : (
            <p className="text-sm text-brand-muted">
              The owner has not published contact details. Use the message form
              below to get in touch.
            </p>
          )}
        </section>

        <section
          aria-labelledby="collaborate-heading"
          className="space-y-4 rounded-2xl bg-brand-sage p-6"
        >
          <h2
            id="collaborate-heading"
            className="font-display text-2xl font-semibold"
          >
            Collaborate
          </h2>
          <CollaborationPanel
            availability={business.collaboration}
            businessId={business.id}
          />
        </section>
      </Container>
    </section>
  );
}

function CollaborationPanel({
  availability,
  businessId,
}: {
  availability: CollaborationAvailability;
  businessId: string;
}) {
  switch (availability.state) {
    case "owner":
      return (
        <div className="space-y-4">
          <p className="text-brand-ink">
            You manage this listing. Messages from members appear on the manage
            page.
          </p>
          <Button
            variant="outline"
            render={<Link href={`${ROUTES.appBusinesses}/manage`} />}
          >
            Open manage page
          </Button>
        </div>
      );
    case "cooldown":
      return (
        <p className="text-brand-ink">
          You sent a message to this business recently. You can send another on{" "}
          {formatDate(availability.availableAt)}.
        </p>
      );
    case "available":
      return <CollaborationRequestForm businessId={businessId} />;
    case "unavailable":
      return (
        <p className="text-brand-ink">
          Messaging is not available for this listing.
        </p>
      );
  }
}
