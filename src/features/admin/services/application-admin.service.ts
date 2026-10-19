import "server-only";

import type { Prisma, StaffRole } from "@/generated/prisma/client";
import { recordAudit } from "@/features/audit/services/audit.service";
import { loadApplicationSnapshot } from "@/features/registration/services/application-snapshot.service";
import { getApplicationGaps } from "@/features/registration/domain/completeness";
import { openAutomaticRefundRequest } from "@/features/payments/services/refund.service";
import { notifyMemberOfApplicationDecision } from "@/features/notifications/services/member-email.service";
import { createNotification } from "@/features/notifications/services/notification.service";
import { syncMembershipForUser } from "@/features/membership/services/eligibility.service";
import { assertApplicationTransition, type ApplicationState } from "@/features/membership/domain/state-machines";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { cleanText } from "@/lib/security/text";
import { currentYearInZone } from "@/lib/time";
import { actionError, actionOk, type ActionResult } from "@/types/action";

export type ReviewDecision = "NOTE" | "REQUEST_CHANGES" | "APPROVE" | "REJECT";

export interface ApplicationFilters {
  status?: ApplicationState;
  batchYear?: number;
  city?: string;
  occupation?: "EMPLOYED" | "BUSINESS_OWNER" | "SELF_EMPLOYED_FREELANCER" | "STUDENT" | "SEEKING_OPPORTUNITIES" | "RETIRED" | "OTHER";
  submittedFrom?: Date;
  submittedTo?: Date;
}

/** Applications for the review queue. Filters are applied in the database, never in the browser. */
export async function listApplicationsForReview(filters: ApplicationFilters, limit: number) {
  const where: Prisma.AlumniApplicationWhereInput = {
    ...(filters.status ? { status: filters.status } : { status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] } }),
    user: {
      profile: {
        ...(filters.batchYear ? { matricYear: filters.batchYear } : {}),
        ...(filters.city ? { currentCity: { contains: filters.city, mode: "insensitive" } } : {}),
        ...(filters.occupation ? { professionalStatuses: { has: filters.occupation } } : {}),
      },
    },
    ...(filters.submittedFrom || filters.submittedTo
      ? { submittedAt: { gte: filters.submittedFrom, lte: filters.submittedTo } }
      : {}),
  };

  return db.alumniApplication.findMany({
    where,
    orderBy: { submittedAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      status: true,
      submittedAt: true,
      version: true,
      user: {
        select: {
          id: true,
          name: true,
          profile: { select: { matricYear: true, currentCity: true, professionalStatuses: true, batchReviewRequested: true } },
          membership: { select: { status: true } },
        },
      },
    },
  });
}

/** Full review view, including private school details. Callers must hold a membership-administration role. */
export async function getApplicationForReview(userId: string) {
  const [application, snapshot] = await Promise.all([
    db.alumniApplication.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        version: true,
        submittedAt: true,
        decisionReason: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            profile: {
              include: { skills: { include: { skill: true } }, educations: true, contactVisibility: true, batch: true },
            },
            membership: { select: { status: true } },
            orders: {
              select: { id: true, reference: true, status: true, amountMinor: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, action: true, note: true, createdAt: true, reviewer: { select: { name: true } } },
        },
      },
    }),
    loadApplicationSnapshot(db, userId),
  ]);
  if (!application) {
    return null;
  }
  const gaps = getApplicationGaps(snapshot, currentYearInZone());
  return { ...application, gaps };
}

interface DecideApplicationInput {
  userId: string;
  decision: ReviewDecision;
  note: string;
  expectedVersion: number;
  actorId: string;
  actorRoles: readonly StaffRole[];
}

const DECISION_ACTIONS: Record<ReviewDecision, "NOTE" | "REQUESTED_CHANGES" | "APPROVED" | "REJECTED"> = {
  NOTE: "NOTE",
  REQUEST_CHANGES: "REQUESTED_CHANGES",
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
};

class ReviewRejectedError extends Error {}

/**
 * Applies one reviewer decision. The version check means two reviewers acting on the same screen cannot both
 * succeed. Approval runs the membership check in the same transaction, so activation and approval always agree.
 */
export async function decideApplication(input: DecideApplicationInput): Promise<ActionResult<{ status: ApplicationState; membershipActivated: boolean }>> {
  const note = cleanText(input.note).slice(0, 1000);

  if (input.decision !== "NOTE" && note.length < 5) {
    return actionError("Record the reason for this decision (at least 5 characters). Members see the reason.");
  }

  try {
    const outcome = await db.$transaction(async (tx) => {
      const application = await tx.alumniApplication.findUnique({
        where: { userId: input.userId },
        select: { id: true, status: true, version: true },
      });
      if (!application) {
        throw new ReviewRejectedError("This application could not be found.");
      }
      if (application.version !== input.expectedVersion) {
        throw new ReviewRejectedError("This application changed while you were reviewing it. Reload it and decide again.");
      }

      const from = application.status as ApplicationState;
      const now = new Date();

      if (input.decision === "NOTE") {
        await tx.applicationReview.create({
          data: { applicationId: application.id, reviewerId: input.actorId, action: "NOTE", note: note || null },
        });
        return { status: from, membershipActivated: false, notify: null };
      }

      const to: ApplicationState =
        input.decision === "APPROVE" ? "APPROVED" : input.decision === "REJECT" ? "REJECTED" : "CHANGES_REQUESTED";
      assertApplicationTransition(from, to);

      if (input.decision === "APPROVE") {
        const snapshot = await loadApplicationSnapshot(tx, input.userId);
        const gaps = getApplicationGaps(snapshot, currentYearInZone());
        if (gaps.length > 0) {
          throw new ReviewRejectedError("This application is missing required details. Request changes instead.");
        }
      }

      const updated = await tx.alumniApplication.updateMany({
        where: { id: application.id, version: input.expectedVersion, status: from },
        data: {
          status: to,
          decidedAt: to === "CHANGES_REQUESTED" ? null : now,
          decidedById: to === "CHANGES_REQUESTED" ? null : input.actorId,
          decisionReason: note || null,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new ReviewRejectedError("This application changed while you were reviewing it. Reload it and decide again.");
      }

      await tx.applicationReview.create({
        data: {
          applicationId: application.id,
          reviewerId: input.actorId,
          action: DECISION_ACTIONS[input.decision],
          note: note || null,
        },
      });

      let membershipActivated = false;
      if (input.decision === "APPROVE") {
        membershipActivated = (await syncMembershipForUser(input.userId, tx)).activated;
      }

      if (input.decision === "REJECT") {
        await closePendingMembership(tx, input.userId, "Application not approved");
        await openAutomaticRefundRequest(tx, {
          userId: input.userId,
          reason: "Application rejected after the registration fee was confirmed",
        });
      }

      await recordAudit(tx, {
        action: `application.${input.decision.toLowerCase()}`,
        entityType: "application",
        entityId: application.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
        metadata: { fromStatus: from, toStatus: to },
      });

      await createNotification(tx, {
        userId: input.userId,
        kind: "APPLICATION_UPDATE",
        title:
          to === "APPROVED"
            ? "Application approved"
            : to === "REJECTED"
              ? "Application not approved"
              : "Changes requested on your application",
        body: note || "Open your status page for details.",
        linkPath: "/app/status",
      });

      return { status: to, membershipActivated, notify: { decision: to, version: input.expectedVersion + 1 } as const };
    });

    if (outcome.notify) {
      await notifyMemberOfApplicationDecision({
        userId: input.userId,
        decision: outcome.notify.decision === "APPROVED" ? "APPROVED" : outcome.notify.decision === "REJECTED" ? "REJECTED" : "CHANGES_REQUESTED",
        applicationVersion: outcome.notify.version,
        reason: note || null,
      });
    }
    return actionOk({ status: outcome.status, membershipActivated: outcome.membershipActivated });
  } catch (error) {
    if (error instanceof ReviewRejectedError) {
      return actionError(error.message);
    }
    if (error instanceof Error && error.name === "InvalidTransitionError") {
      return actionError("This application cannot move to that status from its current state.");
    }
    log("error", "application.decision_failed", { userId: input.userId, decision: input.decision });
    return actionError("The decision could not be saved. Reload the application and try again.");
  }
}

/** A rejected applicant keeps their account and status page, but their membership is closed. */
async function closePendingMembership(tx: Prisma.TransactionClient, userId: string, reason: string): Promise<void> {
  await tx.membership.updateMany({
    where: { userId, status: "PENDING" },
    data: { status: "CLOSED", closedAt: new Date(), closedReason: reason },
  });
}
