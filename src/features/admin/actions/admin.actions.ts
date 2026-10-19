"use server";

import type { StaffRole } from "@/generated/prisma/client";
import { requireStaffRole } from "@/lib/session";
import type { ActionResult } from "@/types/action";
import { actionError } from "@/types/action";
import { decideReport, type ReportDecision } from "@/features/reports/services/report.service";
import { decideApplication, type ReviewDecision } from "../services/application-admin.service";
import {
  addBatchYear,
  decideBatchChange,
  grantStaffRole,
  reinstateMember,
  revokeStaffRole,
  saveContentDraft,
  publishContent,
  setBatchListed,
  suspendMember,
} from "../services/admin-operations.service";
import { CONTENT_KEYS, type ContentKey } from "@/features/content/domain/documents";
import { saveReceivingAccount, scheduleRegistrationFee, type ReceivingAccountInput } from "@/features/payments/services/payment-setup.service";

const MEMBERSHIP_ROLES = ["MEMBERSHIP_ADMIN", "SUPER_ADMIN"] as const satisfies readonly StaffRole[];
const FINANCE_ROLES = ["FINANCE_REVIEWER", "SUPER_ADMIN"] as const satisfies readonly StaffRole[];
const CONTENT_ROLES = ["CONTENT_MODERATOR", "SUPER_ADMIN"] as const satisfies readonly StaffRole[];
const MODERATION_ROLES = ["CONTENT_MODERATOR", "MEMBERSHIP_ADMIN", "SUPER_ADMIN"] as const satisfies readonly StaffRole[];

export async function decideApplicationAction(input: {
  userId: string;
  decision: ReviewDecision;
  note: string;
  expectedVersion: number;
}): Promise<ActionResult<{ status: string; membershipActivated: boolean }>> {
  const staff = await requireStaffRole(MEMBERSHIP_ROLES);
  return decideApplication({ ...input, actorId: staff.id, actorRoles: staff.roles });
}

export async function decideBatchChangeAction(input: { requestId: string; decision: "APPROVED" | "REJECTED" }): Promise<ActionResult> {
  const staff = await requireStaffRole(MEMBERSHIP_ROLES);
  return decideBatchChange({ ...input, actorId: staff.id, actorRoles: staff.roles });
}

export async function addBatchAction(input: { year: number; label: string }): Promise<ActionResult> {
  const staff = await requireStaffRole(MEMBERSHIP_ROLES);
  return addBatchYear({ ...input, actorId: staff.id, actorRoles: staff.roles });
}

export async function setBatchListedAction(input: { batchId: string; listed: boolean }): Promise<ActionResult> {
  const staff = await requireStaffRole(MEMBERSHIP_ROLES);
  return setBatchListed({ ...input, actorId: staff.id, actorRoles: staff.roles });
}

export async function suspendMemberAction(input: { userId: string; reason: string }): Promise<ActionResult> {
  const staff = await requireStaffRole(MEMBERSHIP_ROLES);
  return suspendMember({ ...input, actorId: staff.id, actorRoles: staff.roles });
}

export async function reinstateMemberAction(input: { userId: string }): Promise<ActionResult> {
  const staff = await requireStaffRole(MEMBERSHIP_ROLES);
  return reinstateMember({ ...input, actorId: staff.id, actorRoles: staff.roles });
}

export async function grantRoleAction(values: unknown): Promise<ActionResult> {
  const staff = await requireStaffRole(["SUPER_ADMIN"]);
  return grantStaffRole({ actorId: staff.id, actorRoles: staff.roles, values });
}

export async function revokeRoleAction(assignmentId: string): Promise<ActionResult> {
  const staff = await requireStaffRole(["SUPER_ADMIN"]);
  return revokeStaffRole({ actorId: staff.id, actorRoles: staff.roles, assignmentId });
}

export async function saveContentDraftAction(input: { key: ContentKey; value: unknown }): Promise<ActionResult> {
  const staff = await requireStaffRole(CONTENT_ROLES);
  if (!Object.values(CONTENT_KEYS).includes(input.key)) {
    return actionError("Unknown content document.");
  }
  return saveContentDraft({ ...input, actorId: staff.id, actorRoles: staff.roles });
}

export async function publishContentAction(key: ContentKey): Promise<ActionResult> {
  const staff = await requireStaffRole(CONTENT_ROLES);
  if (!Object.values(CONTENT_KEYS).includes(key)) {
    return actionError("Unknown content document.");
  }
  return publishContent({ key, actorId: staff.id, actorRoles: staff.roles });
}

export async function saveReceivingAccountAction(input: { id: string | null; data: ReceivingAccountInput }): Promise<ActionResult<{ id: string }>> {
  const staff = await requireStaffRole(FINANCE_ROLES);
  return saveReceivingAccount({ id: input.id, data: input.data, actorId: staff.id });
}

export async function scheduleFeeAction(input: { amountRupees: number; effectiveFrom: string | null; note: string }): Promise<ActionResult<{ id: string }>> {
  const staff = await requireStaffRole(FINANCE_ROLES);
  const effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : null;
  if (effectiveFrom && Number.isNaN(effectiveFrom.getTime())) {
    return actionError("Enter a valid start date.");
  }
  return scheduleRegistrationFee({ amountRupees: input.amountRupees, effectiveFrom, note: input.note, actorId: staff.id });
}

export async function decideReportAction(input: { reportId: string; decision: ReportDecision }): Promise<ActionResult> {
  const staff = await requireStaffRole(MODERATION_ROLES);
  const result = await decideReport({ reportId: input.reportId, decision: input.decision, actorId: staff.id, actorRoles: staff.roles });
  return result.ok ? { ok: true, data: undefined } : actionError("This report was already decided.");
}
