import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { DEFAULT_FAQ } from "@/features/content/domain/defaults";
import { CONTENT_KEYS, faqDocumentSchema } from "@/features/content/domain/documents";
import { getPublishedDocument } from "@/features/content/services/content.service";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about eligibility, the registration fee, payment review and privacy.",
};
export const revalidate = 300;

export default async function FaqPage() {
  const faq = await getPublishedDocument(CONTENT_KEYS.faq, faqDocumentSchema, DEFAULT_FAQ);

  return (
    <section className="py-16 md:py-24">
      <Container className="max-w-3xl space-y-10">
        <SectionHeading as="h1" eyebrow="Help" title="Frequently asked questions" />
        <dl className="divide-y divide-brand-border border-y border-brand-border">
          {faq.items.map((item) => (
            <div key={item.question} className="space-y-3 py-6">
              <dt className="font-display text-2xl font-semibold">{item.question}</dt>
              <dd className="leading-relaxed text-brand-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
