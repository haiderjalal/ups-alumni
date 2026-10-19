import type { ContactDocument, FaqDocument, PolicyDocument } from "./documents";

/**
 * Default copy used until an administrator publishes a document. Statements are limited to verified
 * facts or product behaviour. Policies say plainly that the school must review them before live collection.
 */

export const DEFAULT_FAQ: FaqDocument = {
  items: [
    {
      question: "Who can join the network?",
      answer:
        "Former students of University Public School. During registration you choose your matric completion year. If your batch is not in the list, you can ask for a manual review.",
    },
    {
      question: "What does membership cost?",
      answer:
        "A one-time registration fee of Rs. 500. There is no recurring subscription. Donations and paid event tickets are separate and are never charged as part of membership.",
    },
    {
      question: "How do I pay the fee?",
      answer:
        "Transfer the fee to a receiving account shown in your payment step, quote your order reference in the narration, and upload the transfer receipt. A finance reviewer then checks the transfer against the receiving-account statement.",
    },
    {
      question: "Why are payment and approval separate?",
      answer:
        "Confirming your payment and reviewing your alumni application are two separate checks. Your membership becomes active only when both are complete and your email is verified. The school will publish its review timelines before live collections start.",
    },
    {
      question: "Who can see my contact details?",
      answer:
        "Your phone number and email are private by default. You choose who can see each one, and you decide whether your profile appears in the directory.",
    },
  ],
};

export const DEFAULT_CONTACT: ContactDocument = {
  email: "",
  phone: "",
  postalAddress: "",
  responseTimeNote: "",
};

export const DEFAULT_POLICIES: Record<"privacy" | "terms" | "refund", PolicyDocument> = {
  privacy: {
    title: "Privacy notice",
    reviewStatus: "PENDING_SCHOOL_REVIEW",
    paragraphs: [
      "This notice explains what the UPS Alumni Network collects, why, and who can see it. The school must review and publish final wording before live registrations begin.",
      "We collect only what membership needs: your name, email, matric year, current location and the professional details you choose to share. Phone numbers, email addresses and directory listings are private unless you change those settings.",
      "Receipts and transfer evidence are stored privately and are visible only to authorized finance reviewers.",
    ],
  },
  terms: {
    title: "Terms of use",
    reviewStatus: "PENDING_SCHOOL_REVIEW",
    paragraphs: [
      "These terms describe how members use the alumni network. The school must review and publish final wording before live registrations begin.",
      "Members agree to provide accurate information, respect other members, and keep their sign-in details private. The network may remove content that breaches these rules.",
    ],
  },
  refund: {
    title: "Refund policy",
    reviewStatus: "PENDING_SCHOOL_REVIEW",
    paragraphs: [
      "The Rs. 500 registration fee is a one-time payment. Refund requests are reviewed by finance staff, and a refund is recorded only after it has actually been processed.",
      "If an application is not approved after payment, the fee is routed to a refund review. The processing timelines and conditions will be published by the school before live collections start.",
    ],
  },
};
