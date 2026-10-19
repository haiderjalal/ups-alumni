import "server-only";

import { ROUTES } from "@/constants/routes";
import { recordAudit } from "@/features/audit/services/audit.service";
import { createNotification } from "@/features/notifications/services/notification.service";
import type { StaffRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import {
  canTransitionOpportunity,
  isDeadlineInFuture,
} from "../domain/opportunity-rules";

export interface OpportunityDecisionInput {
  opportunityId: string;
  actorId: string;
  actorRoles: readonly StaffRole[];
  decision: "PUBLISHED" | "REJECTED";
}

export interface PendingOpportunityReview {
  id: string;
  title: string;
  organization: string;
  category: string;
  remoteType: string;
  locationCity: string | null;
  description: string;
  applicationUrl: string;
  deadline: Date | null;
  createdAt: Date;
  postedByName: string;
}

/**
 * Publishes or rejects an opportunity awaiting review. The caller verifies the staff role. The status
 * change is a compare-and-set, and the audit row and poster notice are written in the same transaction.
 */
export async function decideOpportunity(
  input: OpportunityDecisionInput,
  now: Date = new Date(),
): Promise<ActionResult> {
  return db.$transaction(async (tx) => {
    const opportunity = await tx.opportunity.findUnique({
      where: { id: input.opportunityId },
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        postedById: true,
      },
    });
    if (!opportunity) {
      return actionError("This opportunity no longer exists.");
    }
    if (!canTransitionOpportunity(opportunity.status, input.decision)) {
      return actionError("This opportunity is not awaiting review.");
    }
    if (
      input.decision === "PUBLISHED" &&
      opportunity.deadline &&
      !isDeadlineInFuture(opportunity.deadline, now)
    ) {
      return actionError(
        "The deadline has passed, so this opportunity cannot be published.",
      );
    }

    const result = await tx.opportunity.updateMany({
      where: { id: opportunity.id, status: opportunity.status },
      data: {
        status: input.decision,
        reviewedById: input.actorId,
        reviewedAt: now,
      },
    });
    if (result.count !== 1) {
      return actionError("This opportunity changed. Reload and try again.");
    }

    await recordAudit(tx, {
      action:
        input.decision === "PUBLISHED"
          ? "opportunity.published"
          : "opportunity.rejected",
      entityType: "opportunity",
      entityId: opportunity.id,
      actorId: input.actorId,
      actorRoles: input.actorRoles,
      metadata: { decision: input.decision },
    });

    const isPublished = input.decision === "PUBLISHED";
    await createNotification(tx, {
      userId: opportunity.postedById,
      kind: "SYSTEM",
      title: isPublished
        ? "Your opportunity is live"
        : "Your opportunity was not approved",
      body: isPublished
        ? `${opportunity.title} is now listed for members.`
        : `${opportunity.title} was not approved. You can submit a revised opportunity.`,
      linkPath: isPublished
        ? `${ROUTES.appOpportunities}/${opportunity.id}`
        : `${ROUTES.appOpportunities}/new`,
    });

    return actionOk();
  });
}

/** Opportunities waiting for a decision, oldest first. Callers verify the staff role. */
export async function listOpportunitiesPendingReview(
  limit: number,
): Promise<PendingOpportunityReview[]> {
  const rows = await db.opportunity.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      title: true,
      organization: true,
      category: true,
      remoteType: true,
      locationCity: true,
      description: true,
      applicationUrl: true,
      deadline: true,
      createdAt: true,
      postedBy: { select: { name: true } },
    },
  });
  return rows.map(({ postedBy, ...row }) => ({
    ...row,
    postedByName: postedBy.name,
  }));
}

/**
 * Closes published opportunities whose deadline has passed. Intended for the scheduled worker. Listings
 * already hide expired items, so this keeps stored status accurate. Returns the number closed.
 */
export async function expireOpportunities(now: Date): Promise<number> {
  const result = await db.opportunity.updateMany({
    where: { status: "PUBLISHED", deadline: { lt: now } },
    data: { status: "CLOSED" },
  });
  if (result.count > 0) {
    log("info", "opportunities.expired", { count: result.count });
  }
  return result.count;
}
