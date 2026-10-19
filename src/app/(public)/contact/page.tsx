import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { DEFAULT_CONTACT } from "@/features/content/domain/defaults";
import { CONTENT_KEYS, contactDocumentSchema } from "@/features/content/domain/documents";
import { getPublishedDocument } from "@/features/content/services/content.service";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the UPS Alumni Network team.",
};
export const revalidate = 300;

export default async function ContactPage() {
  const contact = await getPublishedDocument(CONTENT_KEYS.contact, contactDocumentSchema, DEFAULT_CONTACT);
  const hasDetails = Boolean(contact.email || contact.phone || contact.postalAddress);

  return (
    <section className="py-16 md:py-24">
      <Container className="max-w-3xl space-y-10">
        <SectionHeading
          as="h1"
          eyebrow="Contact"
          title="Get in touch"
          description="Account, payment and profile questions can be sent through your member dashboard once you have registered."
        />
        {hasDetails ? (
          <dl className="grid gap-6 sm:grid-cols-2">
            {contact.email ? (
              <div>
                <dt className="text-sm font-semibold text-brand-muted">Email</dt>
                <dd className="mt-1 break-all text-lg">{contact.email}</dd>
              </div>
            ) : null}
            {contact.phone ? (
              <div>
                <dt className="text-sm font-semibold text-brand-muted">Phone</dt>
                <dd className="mt-1 text-lg">{contact.phone}</dd>
              </div>
            ) : null}
            {contact.postalAddress ? (
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-brand-muted">Postal address</dt>
                <dd className="mt-1 whitespace-pre-line text-lg">{contact.postalAddress}</dd>
              </div>
            ) : null}
            {contact.responseTimeNote ? (
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-brand-muted">Response times</dt>
                <dd className="mt-1 text-lg">{contact.responseTimeNote}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="rounded-xl border border-dashed border-brand-border bg-brand-surface p-6 text-brand-muted">
            The school has not published contact details for the network yet. Check back soon.
          </p>
        )}
      </Container>
    </section>
  );
}
