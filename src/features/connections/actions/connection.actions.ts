"use server";

import { refresh } from "next/cache";

import { requireActiveMember } from "@/lib/session";
import { actionError, type ActionResult } from "@/types/action";

import { reportInputSchema } from "../validation/report.schema";
import { memberActionInputSchema, sendConnectionRequestInputSchema } from "../validation/connection.schema";
import { blockMember, unblockMember } from "../services/block.service";
import { reportMemberProfile } from "../services/member-report.service";
import {
  acceptConnectionRequest,
  declineConnectionRequest,
  removeConnection,
  sendConnectionRequest,
  withdrawConnectionRequest,
} from "../services/connection-request.service";

const INVALID_INPUT_MESSAGE = "Check the details and try again.";

const reportMemberInputSchema = memberActionInputSchema.extend(reportInputSchema.shape);

export async function sendConnectionRequestAction(input: unknown): Promise<ActionResult<{ requestId: string }>> {
  const viewer = await requireActiveMember();
  const parsed = sendConnectionRequestInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }

  const result = await sendConnectionRequest({
    requesterId: viewer.id,
    addresseeId: parsed.data.memberId,
    note: parsed.data.note,
  });
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function acceptConnectionRequestAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = memberActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }

  const result = await acceptConnectionRequest(viewer.id, parsed.data.memberId);
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function declineConnectionRequestAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = memberActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }

  const result = await declineConnectionRequest(viewer.id, parsed.data.memberId);
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function withdrawConnectionRequestAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = memberActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }

  const result = await withdrawConnectionRequest(viewer.id, parsed.data.memberId);
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function removeConnectionAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = memberActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }

  const result = await removeConnection(viewer.id, parsed.data.memberId);
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function blockMemberAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = memberActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }

  const result = await blockMember(viewer.id, parsed.data.memberId);
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function unblockMemberAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = memberActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }

  const result = await unblockMember(viewer.id, parsed.data.memberId);
  if (result.ok) {
    refresh();
  }
  return result;
}

export async function reportMemberAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = reportMemberInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }

  return reportMemberProfile(viewer.id, parsed.data.memberId, {
    reason: parsed.data.reason,
    details: parsed.data.details,
  });
}
