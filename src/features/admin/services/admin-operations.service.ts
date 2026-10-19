import "server-only";

import { z } from "zod";

import type { StaffRole } from "@/generated/prisma/client";
import { recordAudit } from "@/features/audit/services/audit.service";
import { revokeMemberAccess } from "@/features/membership/services/membership-transition.service";
import { syncMembershipForUser, loadEligibilityFacts } from "@/features/membership/services/eligibility.service";
import { evaluateEligibility } from "@/features/membership/domain/eligibility";
import { canTransitionMembership } from "@/features/membership/domain/state-machines";
import { CONTENT_KEYS, contactDocumentSchema, faqDocumentSchema, policyDocumentSchema, type ContentKey } from "@/features/content/domain/documents";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { cleanText, cleanSingleLine } from "@/lib/security/text";
import { currentYearInZone } from "@/lib/time";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { MIN_MATRIC_YEAR } from "@/features/registration/domain/completeness";

/* ----------------------------------------------------------------------------
 * Staff roles. Only super admins grant or revoke roles. Nobody grants a role to
 * themselves, and the last super admin cannot be removed.
 * ------------------------------------------------------------------------- */

const grantRoleSchema = z.object({
  userId: z.string().min(1).max(64),
  role: z.enum([
    "SUPER_ADMIN",
    "MEMBERSHIP_ADMIN",
    "FINANCE_REVIEWER",
    "CONTENT_MODERATOR",
    "BATCH_REPRESENTATIVE",
    "GROUP_REPRESENTATIVE",
  ]),
  batchId: z.string().max(64).optional(),
  groupId: z.string().max(64).optional(),
});

export async function grantStaffRole(input: {
  actorId: string;
  actorRoles: readonly StaffRole[];
  values: unknown;
}): Promise<ActionResult> {
  if (!input.actorRoles.includes("SUPER_ADMIN")) {
    return actionError("Only super administrators can change staff roles.");
  }
  const parsed = grantRoleSchema.safeParse(input.values);
  if (!parsed.success) {
    return actionError("Choose a valid user and role.");
  }
  const data = parsed.data;
  if (data.userId === input.actorId && data.role !== "SUPER_ADMIN") {
    return actionError("You cannot change your own roles.");
  }
  if (data.role === "BATCH_REPRESENTATIVE" && !data.batchId) {
    return actionError("Choose the batch this representative covers.");
  }
  if (data.role === "GROUP_REPRESENTATIVE" && !data.groupId) {
    return actionError("Choose the group this representative covers.");
  }

  const target = await db.user.findUnique({ where: { id: data.userId }, select: { id: true } });
  if (!target) {
    return actionError("That user could not be found.");
  }

  const existing = await db.roleAssignment.findFirst({
    where: {
      userId: data.userId,
      role: data.role,
      batchId: data.batchId ?? null,
      groupId: data.groupId ?? null,
      revokedAt: null,
    },
    select: { id: true },
  });
  if (existing) {
    return actionOk();
  }

  await db.$transaction(async (tx) => {
    const created = await tx.roleAssignment.create({
      data: {
        userId: data.userId,
        role: data.role,
        batchId: data.batchId ?? null,
        groupId: data.groupId ?? null,
        grantedById: input.actorId,
      },
      select: { id: true },
    });
    await recordAudit(tx, {
      action: "role.granted",
      entityType: "role_assignment",
      entityId: created.id,
      actorId: input.actorId,
      actorRoles: input.actorRoles,
      metadata: { role: data.role, scoped: Boolean(data.batchId || data.groupId) },
    });
    return created;
  });
  return actionOk();
}

export async function revokeStaffRole(input: {
  actorId: string;
  actorRoles: readonly StaffRole[];
  assignmentId: string;
}): Promise<ActionResult> {
  if (!input.actorRoles.includes("SUPER_ADMIN")) {
    return actionError("Only super administrators can change staff roles.");
  }

  try {
    await db.$transaction(async (tx) => {
      const assignment = await tx.roleAssignment.findUnique({
        where: { id: input.assignmentId },
        select: { id: true, userId: true, role: true, revokedAt: true },
      });
      if (!assignment || assignment.revokedAt) {
        throw new Error("ASSIGNMENT_NOT_ACTIVE");
      }
      if (assignment.role === "SUPER_ADMIN") {
        const remaining = await tx.roleAssignment.count({
          where: { role: "SUPER_ADMIN", revokedAt: null, id: { not: assignment.id } },
        });
        if (remaining === 0) {
          throw new Error("LAST_SUPER_ADMIN");
        }
      }
      await tx.roleAssignment.update({ where: { id: assignment.id }, data: { revokedAt: new Date() } });
      await recordAudit(tx, {
        action: "role.revoked",
        entityType: "role_assignment",
        entityId: assignment.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
        metadata: { role: assignment.role },
      });
    });
    return actionOk();
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_SUPER_ADMIN") {
      return actionError("The last super administrator cannot be removed. Grant the role to someone else first.");
    }
    if (error instanceof Error && error.message === "ASSIGNMENT_NOT_ACTIVE") {
      return actionError("This role is already removed.");
    }
    log("error", "role.revoke_failed", { assignmentId: input.assignmentId });
    return actionError("The role could not be removed. Try again.");
  }
}

/* ----------------------------------------------------------------------------
 * Batch catalog and batch-change requests
 * ------------------------------------------------------------------------- */

export async function listBatchesForAdmin() {
  return db.batch.findMany({
    orderBy: { year: "desc" },
    select: { id: true, year: true, label: true, isListed: true, _count: { select: { profiles: true } } },
  });
}

export async function addBatchYear(input: { year: number; label: string; actorId: string; actorRoles: readonly StaffRole[] }): Promise<ActionResult> {
  const currentYear = currentYearInZone();
  if (!Number.isInteger(input.year) || input.year < MIN_MATRIC_YEAR || input.year > currentYear) {
    return actionError(`Enter a year between ${MIN_MATRIC_YEAR} and ${currentYear}.`);
  }
  const label = cleanSingleLine(input.label).slice(0, 80) || null;
  try {
    await db.$transaction(async (tx) => {
      const batch = await tx.batch.create({ data: { year: input.year, label, isListed: true }, select: { id: true } });
      await recordAudit(tx, {
        action: "batch.created",
        entityType: "batch",
        entityId: batch.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
        metadata: { year: input.year },
      });
    });
    return actionOk();
  } catch (error) {
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      return actionError("That batch is already in the catalog.");
    }
    throw error;
  }
}

export async function setBatchListed(input: { batchId: string; listed: boolean; actorId: string; actorRoles: readonly StaffRole[] }): Promise<ActionResult> {
  await db.$transaction(async (tx) => {
    await tx.batch.update({ where: { id: input.batchId }, data: { isListed: input.listed } });
    await recordAudit(tx, {
      action: input.listed ? "batch.listed" : "batch.unlisted",
      entityType: "batch",
      entityId: input.batchId,
      actorId: input.actorId,
      actorRoles: input.actorRoles,
    });
  });
  return actionOk();
}

export async function listPendingBatchChanges(limit: number) {
  return db.batchChangeRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      requestedYear: true,
      reason: true,
      createdAt: true,
      user: { select: { id: true, name: true, profile: { select: { matricYear: true } } } },
    },
  });
}

/**
 * Identity-sensitive batch edits by active members. Approving moves the member to the new batch. Rejecting keeps
 * the old batch. Either way the request is recorded and the decision is audited.
 */
export async function decideBatchChange(input: {
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  actorId: string;
  actorRoles: readonly StaffRole[];
}): Promise<ActionResult> {
  try {
    await db.$transaction(async (tx) => {
      const request = await tx.batchChangeRequest.findUnique({
        where: { id: input.requestId },
        select: { id: true, userId: true, requestedYear: true, status: true },
      });
      if (!request || request.status !== "PENDING") {
        throw new Error("NOT_PENDING");
      }

      const updated = await tx.batchChangeRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: { status: input.decision, decidedById: input.actorId, decidedAt: new Date() },
      });
      if (updated.count !== 1) {
        throw new Error("NOT_PENDING");
      }

      if (input.decision === "APPROVED") {
        const batch = await tx.batch.findFirst({ where: { year: request.requestedYear, isListed: true }, select: { id: true } });
        await tx.alumniProfile.update({
          where: { userId: request.userId },
          data: { matricYear: request.requestedYear, batchId: batch?.id ?? null, batchReviewRequested: false, batchReviewNote: null },
        });
      }

      await recordAudit(tx, {
        action: `batch_change.${input.decision.toLowerCase()}`,
        entityType: "batch_change_request",
        entityId: request.id,
        actorId: input.actorId,
        actorRoles: input.actorRoles,
        metadata: { requestedYear: request.requestedYear },
      });
    });
    return actionOk();
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_PENDING") {
      return actionError("This request has already been decided.");
    }
    throw error;
  }
}

/* ----------------------------------------------------------------------------
 * Membership management
 * ------------------------------------------------------------------------- */

export async function suspendMember(input: { userId: string; reason: string; actorId: string; actorRoles: readonly StaffRole[] }): Promise<ActionResult> {
  const reason = cleanText(input.reason);
  if (reason.length < 10) {
    return actionError("Record the reason for the suspension (at least 10 characters).");
  }
  const outcome = await db.$transaction((tx) =>
    revokeMemberAccess(tx, {
      userId: input.userId,
      to: "SUSPENDED",
      reason,
      actorId: input.actorId,
      actorRoles: [...input.actorRoles],
    }),
  );
  return outcome.moved ? actionOk() : actionError("This membership cannot be suspended from its current state.");
}

/**
 * Reinstates a suspended member only when every activation fact holds again, including that no refund is open.
 * This prevents a manual reinstatement from bypassing payment or review.
 */
export async function reinstateMember(input: { userId: string; actorId: string; actorRoles: readonly StaffRole[] }): Promise<ActionResult> {
  return db.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({ where: { userId: input.userId }, select: { id: true, status: true } });
    if (!membership || !canTransitionMembership(membership.status, "ACTIVE")) {
      return actionError("Only suspended memberships can be reinstated.");
    }
    const facts = await loadEligibilityFacts(tx, input.userId);
    const result = evaluateEligibility(facts);
    if (!result.eligible) {
      return actionError("This member does not meet every requirement yet, so access cannot be restored.");
    }
    await tx.membership.update({
      where: { id: membership.id },
      data: { status: "ACTIVE", suspendedAt: null, suspendedReason: null },
    });
    await recordAudit(tx, {
      action: "membership.reinstated",
      entityType: "membership",
      entityId: membership.id,
      actorId: input.actorId,
      actorRoles: input.actorRoles,
    });
    await syncMembershipForUser(input.userId, tx);
    return actionOk();
  });
}

/* ----------------------------------------------------------------------------
 * CMS: draft, preview and publish. Public pages read only published content.
 * ------------------------------------------------------------------------- */

const CONTENT_SCHEMAS: Record<ContentKey, z.ZodType> = {
  [CONTENT_KEYS.faq]: faqDocumentSchema,
  [CONTENT_KEYS.contact]: contactDocumentSchema,
  [CONTENT_KEYS.policyPrivacy]: policyDocumentSchema,
  [CONTENT_KEYS.policyTerms]: policyDocumentSchema,
  [CONTENT_KEYS.policyRefund]: policyDocumentSchema,
};

export async function saveContentDraft(input: {
  key: ContentKey;
  value: unknown;
  actorId: string;
  actorRoles: readonly StaffRole[];
}): Promise<ActionResult> {
  const parsed = CONTENT_SCHEMAS[input.key].safeParse(input.value);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "This content is not valid.");
  }
  await db.$transaction(async (tx) => {
    await tx.contentDocument.upsert({
      where: { key: input.key },
      create: { key: input.key, draftJson: parsed.data as object, updatedById: input.actorId, draftUpdatedAt: new Date() },
      update: { draftJson: parsed.data as object, updatedById: input.actorId, draftUpdatedAt: new Date() },
    });
    await recordAudit(tx, {
      action: "content.draft_saved",
      entityType: "content_document",
      entityId: input.key,
      actorId: input.actorId,
      actorRoles: input.actorRoles,
    });
  });
  return actionOk();
}

export async function publishContent(input: { key: ContentKey; actorId: string; actorRoles: readonly StaffRole[] }): Promise<ActionResult> {
  const document = await db.contentDocument.findUnique({ where: { key: input.key }, select: { draftJson: true } });
  if (!document) {
    return actionError("Save a draft before publishing.");
  }
  await db.$transaction(async (tx) => {
    await tx.contentDocument.update({
      where: { key: input.key },
      data: { publishedJson: document.draftJson as object, publishedAt: new Date(), updatedById: input.actorId },
    });
    await recordAudit(tx, {
      action: "content.published",
      entityType: "content_document",
      entityId: input.key,
      actorId: input.actorId,
      actorRoles: input.actorRoles,
    });
  });
  return actionOk();
}

export async function getContentDocumentsForAdmin(key: ContentKey) {
  return db.contentDocument.findUnique({
    where: { key },
    select: { draftJson: true, publishedJson: true, draftUpdatedAt: true, publishedAt: true },
  });
}
