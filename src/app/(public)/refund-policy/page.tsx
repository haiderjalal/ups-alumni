import type { Metadata } from "next";

import { PolicyDocumentView } from "@/components/shared/policy-document";
import { DEFAULT_POLICIES } from "@/features/content/domain/defaults";
import { CONTENT_KEYS, policyDocumentSchema } from "@/features/content/domain/documents";
import { getPublishedDocument } from "@/features/content/services/content.service";

export const metadata: Metadata = { title: "Refund policy" };
export const revalidate = 300;

export default async function RefundPolicyPage() {
  const document = await getPublishedDocument(CONTENT_KEYS.policyRefund, policyDocumentSchema, DEFAULT_POLICIES.refund);
  return <PolicyDocumentView document={document} />;
}
