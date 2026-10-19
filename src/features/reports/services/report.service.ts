import "server-only";

import { z } from "zod";

import { recordAudit } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";
import { cleanText } from "@/lib/security/text";
import type { ReportTargetType, StaffRole } from "@/generated/prisma/client";

export const REPORT_REASONS = [
  "Harassment or abuse",
  "Spam or scams",
  "Impersonation",
  "Inappropriate content",
  "Privacy concern",
  "Other",
] as const;

const reportInputSchema = z.object({
  targetType: z.enum([
    "PROFILE",
    "POST",
    "COMMENT",
    "MESSAGE",
    "BUSINESS",
    "OPPORTUNITY",
    "STORY",
    "EVENT",
  ]),
  targetId: z.string().min(1).max(64),
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(1000).optional(),
});

export type ReportInput = z.input<typeof reportInputSchema>;

export type CreateReportResult =
  | { ok: true; reportId: string; alreadyOpen: boolean }
  | { ok: false; message: string };

/**
 * Files a report. A member who has an open report on the same target gets that report back, so repeated
 * clicks cannot flood the moderation queue. Reports are never visible to the reported member.
 */
export async function createReport(reporterId: string, input: ReportInput): Promise<CreateReportResult> {
  const parsed = reportInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Choose a reason for the report." };
  }

  const existing = await db.report.findFirst({
    where: {
      reporterId,
      targetType: parsed.data.targetType as ReportTargetType,
      targetId: parsed.data.targetId,
      status: "OPEN",
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: true, reportId: existing.id, alreadyOpen: true };
  }

  const report = await db.report.create({
    data: {
      reporterId,
      targetType: parsed.data.targetType as ReportTargetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details ? cleanText(parsed.data.details).slice(0, 1000) : null,
    },
    select: { id: true },
  });

  await recordAudit(db, {
    action: "report.created",
    entityType: "report",
    entityId: report.id,
    actorId: reporterId,
    metadata: { targetType: parsed.data.targetType },
  });

  return { ok: true, reportId: report.id, alreadyOpen: false };
}

/** Moderation queue for staff with a content or membership role. Callers verify the role before calling. */
export async function listOpenReports(limit: number) {
  return db.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: { id: true, targetType: true, targetId: true, reason: true, createdAt: true },
  });
}

export type ReportDecision = "ACTIONED" | "DISMISSED";

export async function decideReport(input: {
  reportId: string;
  actorId: string;
  actorRoles: readonly StaffRole[];
  decision: ReportDecision;
}): Promise<{ ok: boolean }> {
  const result = await db.report.updateMany({
    where: { id: input.reportId, status: "OPEN" },
    data: { status: input.decision, handledById: input.actorId, handledAt: new Date() },
  });
  if (result.count !== 1) {
    return { ok: false };
  }
  await recordAudit(db, {
    action: `report.${input.decision.toLowerCase()}`,
    entityType: "report",
    entityId: input.reportId,
    actorId: input.actorId,
    actorRoles: input.actorRoles,
  });
  return { ok: true };
}
