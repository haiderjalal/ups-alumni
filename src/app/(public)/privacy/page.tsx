import type { Metadata } from "next";

import { PolicyDocumentView } from "@/components/shared/policy-document";
import { DEFAULT_POLICIES } from "@/features/content/domain/defaults";
import { CONTENT_KEYS, policyDocumentSchema } from "@/features/content/domain/documents";
import { getPublishedDocument } from "@/features/content/services/content.service";

export const metadata: Metadata = { title: "Privacy notice" };
export const revalidate = 300;

export default async function PrivacyPage() {
  const document = await getPublishedDocument(CONTENT_KEYS.policyPrivacy, policyDocumentSchema, DEFAULT_POLICIES.privacy);
  return <PolicyDocumentView document={document} />;
}
