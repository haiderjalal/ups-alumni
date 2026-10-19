import "server-only";

import { db } from "@/lib/db";
import { sendEmailNow } from "@/lib/email/outbox";
import { renderEmail } from "@/lib/email/templates";
import { formatRupees } from "@/lib/money";
import { log } from "@/lib/logger";
import { SITE } from "@/constants/site";

import { ROUTES } from "@/constants/routes";

interface MemberContact {
  name: string;
  email: string;
}

async function loadMemberContact(userId: string): Promise<MemberContact | null> {
  return db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
}

function absoluteUrl(path: string): string {
  return new URL(path, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString();
}

/**
 * Emails a payment outcome. Dedupe keys are per attempt and decision, so a retried review never mails twice.
 * A failure here never rolls back the payment decision, which is already committed.
 */
export async function notifyMemberOfPaymentDecision(input: {
  userId: string;
  attemptId: string;
  decision: "CONFIRMED" | "REJECTED";
  membershipActivated: boolean;
}): Promise<void> {
  try {
    const member = await loadMemberContact(input.userId);
    if (!member) {
      return;
    }
    const content =
      input.decision === "CONFIRMED"
        ? renderEmail({
            heading: "Your registration fee is confirmed",
            paragraphs: [
              `Hello ${member.name}, your registration fee has been confirmed.`,
              input.membershipActivated
                ? "Your membership is now active. Sign in to explore the directory, events and community spaces."
                : "Your alumni application is still being reviewed. You will receive another message when it is decided.",
            ],
            action: { label: "Open your dashboard", url: absoluteUrl(ROUTES.app) },
          })
        : renderEmail({
            heading: "Your payment needs correction",
            paragraphs: [
              `Hello ${member.name}, a finance reviewer could not confirm the transfer you submitted.`,
              "Sign in to see the reason, then send corrected evidence. You do not need to pay again.",
            ],
            action: { label: "View payment status", url: absoluteUrl(ROUTES.appPayment) },
          });

    await sendEmailNow({
      to: member.email,
      subject: input.decision === "CONFIRMED" ? `Registration fee confirmed · ${SITE.name}` : `Payment needs correction · ${SITE.name}`,
      dedupeKey: `payment-${input.decision.toLowerCase()}:${input.attemptId}`,
      ...content,
    });
  } catch (error) {
    log("error", "email.payment_notice_failed", { userId: input.userId, error });
  }
}

/** Emails the outcome of an alumni application review. Same dedupe and failure rules as payment notices. */
export async function notifyMemberOfApplicationDecision(input: {
  userId: string;
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  applicationVersion: number;
  reason: string | null;
}): Promise<void> {
  try {
    const member = await loadMemberContact(input.userId);
    if (!member) {
      return;
    }
    const headings = {
      APPROVED: "Your alumni application is approved",
      REJECTED: "Your alumni application was not approved",
      CHANGES_REQUESTED: "Your alumni application needs a few changes",
    } as const;
    const reasonText = input.reason ? `Reviewer note: ${input.reason}` : "";

    await sendEmailNow({
      to: member.email,
      subject: `${headings[input.decision]} · ${SITE.name}`,
      dedupeKey: `application-${input.decision.toLowerCase()}:${input.userId}:${input.applicationVersion}`,
      ...renderEmail({
        heading: headings[input.decision],
        paragraphs: [
          `Hello ${member.name}.`,
          input.decision === "APPROVED"
            ? "Your alumni review is complete. Membership activates once your email and registration fee are confirmed."
            : input.decision === "CHANGES_REQUESTED"
              ? "Please update the highlighted parts of your application. Your answers are saved."
              : "Thank you for applying. If you believe this is a mistake, contact the network team.",
          ...(reasonText ? [reasonText] : []),
        ],
        action: { label: "Open your status", url: absoluteUrl(ROUTES.appStatus) },
      }),
    });
  } catch (error) {
    log("error", "email.application_notice_failed", { userId: input.userId, error });
  }
}

export { formatRupees };
