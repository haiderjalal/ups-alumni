import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import type { PolicyDocument } from "@/features/content/domain/documents";

/** Renders a policy document. Drafts awaiting school review are labelled so visitors are not misled. */
export function PolicyDocumentView({ document }: { document: PolicyDocument }) {
  return (
    <section className="py-16 md:py-24">
      <Container className="max-w-3xl space-y-10">
        <SectionHeading as="h1" title={document.title} />
        {document.reviewStatus === "PENDING_SCHOOL_REVIEW" ? (
          <p
            role="note"
            className="rounded-xl border border-brand-violet/50 bg-brand-lavender px-5 py-4 text-sm leading-relaxed text-brand-ink"
          >
            This wording is a draft pending review by the school. It will be replaced with the published version before
            live registrations begin.
          </p>
        ) : null}
        <div className="space-y-5 text-lg leading-relaxed text-brand-muted">
          {document.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Container>
    </section>
  );
}
