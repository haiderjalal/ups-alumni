import "server-only";

import { createReport, REPORT_REASONS, type ReportInput } from "@/features/reports/services/report.service";
import { db } from "@/lib/db";
import { actionError, actionOk, type ActionResult } from "@/types/action";

const PROFILE_UNAVAILABLE_MESSAGE = "This profile cannot be reported.";
const REASON_REQUIRED_MESSAGE = "Choose a reason for the report.";

/** Narrows a submitted reason to the server's list. Anything else is refused before a report is written. */
export function toReportReason(value: string): ReportInput["reason"] | null {
  return REPORT_REASONS.find((reason) => reason === value) ?? null;
}

/**
 * Files a report against an active member's profile. The report targets the AlumniProfile id, and the
 * reported member never sees it.
 */
export async function reportMemberProfile(
  reporterId: string,
  memberId: string,
  input: { reason: string; details?: string },
): Promise<ActionResult> {
  if (reporterId === memberId) {
    return actionError(PROFILE_UNAVAILABLE_MESSAGE);
  }
  const reason = toReportReason(input.reason);
  if (!reason) {
    return actionError(REASON_REQUIRED_MESSAGE);
  }

  const target = await db.user.findUnique({
    where: { id: memberId },
    select: { membership: { select: { status: true } }, profile: { select: { id: true } } },
  });
  if (!target || target.membership?.status !== "ACTIVE" || !target.profile) {
    return actionError(PROFILE_UNAVAILABLE_MESSAGE);
  }

  const result = await createReport(reporterId, {
    targetType: "PROFILE",
    targetId: target.profile.id,
    reason,
    details: input.details?.trim() ? input.details : undefined,
  });
  return result.ok ? actionOk() : actionError(result.message);
}
