import { z } from "zod";

/**
 * CMS document shapes. Public pages render only the published version of each document; drafts are
 * previewed in the admin area. Every document is validated on read, so a malformed row falls back to the
 * default copy instead of breaking a public page.
 */

export const CONTENT_KEYS = {
  faq: "faq",
  contact: "contact",
  policyPrivacy: "policy.privacy",
  policyTerms: "policy.terms",
  policyRefund: "policy.refund",
} as const;

export type ContentKey = (typeof CONTENT_KEYS)[keyof typeof CONTENT_KEYS];

const shortText = (max: number) => z.string().trim().max(max);

export const faqDocumentSchema = z.object({
  items: z
    .array(
      z.object({
        question: shortText(200).min(1),
        answer: shortText(1200).min(1),
      }),
    )
    .max(40),
});
export type FaqDocument = z.infer<typeof faqDocumentSchema>;

/** Contact details are admin-managed and start empty. Nothing here is invented. */
export const contactDocumentSchema = z.object({
  email: shortText(160).optional().default(""),
  phone: shortText(40).optional().default(""),
  postalAddress: shortText(400).optional().default(""),
  responseTimeNote: shortText(200).optional().default(""),
});
export type ContactDocument = z.infer<typeof contactDocumentSchema>;

export const policyDocumentSchema = z.object({
  title: shortText(120).min(1),
  /** A policy stays marked as pending until the school reviews and publishes its wording. */
  reviewStatus: z.enum(["PENDING_SCHOOL_REVIEW", "PUBLISHED"]),
  paragraphs: z.array(shortText(2000)).max(40),
});
export type PolicyDocument = z.infer<typeof policyDocumentSchema>;
