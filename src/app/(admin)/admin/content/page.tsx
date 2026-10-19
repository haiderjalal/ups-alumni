import type { Metadata } from "next";

import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContentEditor } from "@/features/admin/components/operations-forms";
import { DEFAULT_CONTACT, DEFAULT_FAQ, DEFAULT_POLICIES } from "@/features/content/domain/defaults";
import { CONTENT_KEYS, type ContentKey } from "@/features/content/domain/documents";
import { getContentDocumentsForAdmin } from "@/features/admin/services/admin-operations.service";
import { requireStaffRole } from "@/lib/session";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Content", robots: { index: false, follow: false } };

/** Turns a stored document into the plain-text form the editor shows. The inverse is parseContentText. */
function toEditorText(key: ContentKey, value: unknown): string {
  if (key === CONTENT_KEYS.faq) {
    const items = (value as typeof DEFAULT_FAQ).items;
    return items.map((item) => `${item.question}\n${item.answer}`).join("\n\n");
  }
  if (key === CONTENT_KEYS.contact) {
    const contact = value as typeof DEFAULT_CONTACT;
    return [contact.email, contact.phone, contact.postalAddress, contact.responseTimeNote].join("\n");
  }
  const policy = value as (typeof DEFAULT_POLICIES)["privacy"];
  return `${policy.title}\n${policy.reviewStatus}\n\n${policy.paragraphs.join("\n\n")}`;
}

const DEFAULTS: Record<ContentKey, unknown> = {
  [CONTENT_KEYS.faq]: DEFAULT_FAQ,
  [CONTENT_KEYS.contact]: DEFAULT_CONTACT,
  [CONTENT_KEYS.policyPrivacy]: DEFAULT_POLICIES.privacy,
  [CONTENT_KEYS.policyTerms]: DEFAULT_POLICIES.terms,
  [CONTENT_KEYS.policyRefund]: DEFAULT_POLICIES.refund,
};

const LABELS: Record<ContentKey, string> = {
  [CONTENT_KEYS.faq]: "Frequently asked questions",
  [CONTENT_KEYS.contact]: "Contact details (empty until the school supplies them)",
  [CONTENT_KEYS.policyPrivacy]: "Privacy notice",
  [CONTENT_KEYS.policyTerms]: "Terms of use",
  [CONTENT_KEYS.policyRefund]: "Refund policy",
};

/** Draft, then publish. Public pages show only the published version; drafts are never visible to visitors. */
export default async function ContentPage() {
  await requireStaffRole(["CONTENT_MODERATOR"]);
  const keys = Object.values(CONTENT_KEYS) as ContentKey[];
  const documents = await Promise.all(keys.map((key) => getContentDocumentsForAdmin(key)));

  return (
    <section className="space-y-12">
      <Container className="max-w-none space-y-12 px-0">
        <SectionHeading
          as="h1"
          eyebrow="Content"
          title="Site content"
          description="Edit a draft, then publish it. Policy documents stay marked as pending school review until the school approves the wording."
        />
        {keys.map((key, index) => {
          const document = documents[index];
          const source = document?.draftJson ?? DEFAULTS[key];
          return (
            <section key={key} aria-labelledby={`content-${key}`} className="space-y-5 rounded-2xl border border-brand-border bg-brand-surface p-6">
              <h2 id={`content-${key}`} className="font-display text-3xl font-semibold">
                {LABELS[key]}
              </h2>
              <ContentEditor
                contentKey={key}
                initialText={toEditorText(key, source)}
                draftUpdated={document?.draftUpdatedAt ? formatDateTime(document.draftUpdatedAt) : null}
                publishedAt={document?.publishedAt ? formatDateTime(document.publishedAt) : null}
              />
            </section>
          );
        })}
      </Container>
    </section>
  );
}
