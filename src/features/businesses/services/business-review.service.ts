import "server-only";

import { ROUTES } from "@/constants/routes";
import { recordAudit } from "@/features/audit/services/audit.service";
import { createNotification } from "@/features/notifications/services/notification.service";
import type { StaffRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { cleanText } from "@/lib/security/text";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { canTransitionBusiness } from "../domain/business-rules";

export interface BusinessPublicationDecision {
  businessId: string;
  actorId: string;
  actorRoles: readonly StaffRole[];
  decision: "PUBLISHED" | "REJECTED";
  reason?: string;
}

export interface PendingBusinessReview {
  id: string;
  name: string;
  sector: string;
  city: string;
  description: string;
  productsServices: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  publishContact: boolean;
  updatedAt: Date;
  ownerNames: string[];
}

const MAX_REASON_LENGTH = 400;

/**
 * Publishes or rejects a listing that is awaiting review. The caller verifies the staff role. This
 * function checks the status transition, changes status with a compare-and-set, and writes the audit
 * row and owner notices in the same transaction.
 */
export async function decideBusinessPublication(
  input: BusinessPublicationDecision,
): Promise<ActionResult> {
  const reason = input.reason
    ? cleanText(input.reason).slice(0, MAX_REASON_LENGTH)
    : "";

  return db.$transaction(async (tx) => {
    const business = await tx.business.findUnique({
      where: { id: input.businessId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        owners: { select: { userId: true } },
      },
    });
    if (!business) {
      return actionError("This listing no longer exists.");
    }
    if (!canTransitionBusiness(business.status, input.decision)) {
      return actionError("This listing is not awaiting review.");
    }

    const result = await tx.business.updateMany({
      where: { id: business.id, status: business.status },
      data: { status: input.decision },
    });
    if (result.count !== 1) {
      return actionError("This listing changed. Reload and try again.");
    }

    await recordAudit(tx, {
      action:
        input.decision === "PUBLISHED"
          ? "business.published"
          : "business.rejected",
      entityType: "business",
      entityId: business.id,
      actorId: input.actorId,
      actorRoles: input.actorRoles,
      metadata: { decision: input.decision, hasReason: reason.length > 0 },
    });

    const isPublished = input.decision === "PUBLISHED";
    for (const owner of business.owners) {
      await createNotification(tx, {
        userId: owner.userId,
        kind: "SYSTEM",
        title: isPublished
          ? "Your business listing is live"
          : "Your business listing needs changes",
        body: isPublished
          ? `${business.name} is now in the alumni business directory.`
          : `${business.name} was not approved yet.${reason ? ` Staff note: ${reason}` : ""}`,
        linkPath: isPublished
          ? `${ROUTES.appBusinesses}/${business.slug}`
          : `${ROUTES.appBusinesses}/manage`,
      });
    }

    return actionOk();
  });
}

/** Listings waiting for a decision, oldest change first. Callers verify the staff role. */
export async function listBusinessesPendingReview(
  limit: number,
): Promise<PendingBusinessReview[]> {
  const rows = await db.business.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { updatedAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      name: true,
      sector: true,
      city: true,
      description: true,
      productsServices: true,
      websiteUrl: true,
      contactEmail: true,
      contactPhone: true,
      publishContact: true,
      updatedAt: true,
      owners: { select: { user: { select: { name: true } } } },
    },
  });
  return rows.map(({ owners, ...business }) => ({
    ...business,
    ownerNames: owners.map((owner) => owner.user.name),
  }));
}
