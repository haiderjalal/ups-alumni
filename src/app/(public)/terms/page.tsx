import type { Metadata } from "next";

import { PolicyDocumentView } from "@/components/shared/policy-document";
import { DEFAULT_POLICIES } from "@/features/content/domain/defaults";
import { CONTENT_KEYS, policyDocumentSchema } from "@/features/content/domain/documents";
import { getPublishedDocument } from "@/features/content/services/content.service";

export const metadata: Metadata = { title: "Terms of use" };
export const revalidate = 300;

export default async function TermsPage() {
  const document = await getPublishedDocument(CONTENT_KEYS.policyTerms, policyDocumentSchema, DEFAULT_POLICIES.terms);
  return <PolicyDocumentView document={document} />;
}
