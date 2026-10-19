"use server";

import { memberActionInputSchema } from "@/features/connections/validation/connection.schema";
import { requireActiveMember } from "@/lib/session";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import {
  markConversationRead,
  openConversation,
  requireConversationAccess,
} from "../services/conversation.service";
import {
  loadMessagePage,
  loadNewerMessages,
  reportMessage,
  sendMessage,
  type MessagePage,
  type MessageView,
} from "../services/message.service";
import {
  fetchNewerMessagesInputSchema,
  loadOlderMessagesInputSchema,
  markConversationReadInputSchema,
  reportMessageInputSchema,
  sendMessageInputSchema,
} from "../validation/message.schema";

const INVALID_INPUT_MESSAGE = "Check the details and try again.";

export async function startConversationAction(input: unknown): Promise<ActionResult<{ conversationId: string }>> {
  const viewer = await requireActiveMember();
  const parsed = memberActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }
  return openConversation(viewer.id, parsed.data.memberId);
}

export async function sendMessageAction(input: unknown): Promise<ActionResult<{ message: MessageView }>> {
  const viewer = await requireActiveMember();
  const parsed = sendMessageInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }
  return sendMessage(viewer.id, parsed.data);
}

export async function loadOlderMessagesAction(input: unknown): Promise<ActionResult<MessagePage>> {
  const viewer = await requireActiveMember();
  const parsed = loadOlderMessagesInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }
  return loadMessagePage(viewer.id, parsed.data.conversationId, parsed.data.before);
}

/** Polled by the thread every 15 seconds. Returns messages after the cursor and advances the read marker. */
export async function fetchNewerMessagesAction(input: unknown): Promise<ActionResult<{ messages: MessageView[] }>> {
  const viewer = await requireActiveMember();
  const parsed = fetchNewerMessagesInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }
  return loadNewerMessages(viewer.id, parsed.data.conversationId, parsed.data.after);
}

/** Called when the thread opens. Marks read only through a message the viewer has actually been shown. */
export async function markConversationReadAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = markConversationReadInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }
  if (!parsed.data.readThrough) {
    return actionOk();
  }

  const access = await requireConversationAccess(viewer.id, parsed.data.conversationId);
  if (!access.ok) {
    return access;
  }
  await markConversationRead(viewer.id, parsed.data.conversationId, new Date(parsed.data.readThrough));
  return actionOk();
}

export async function reportMessageAction(input: unknown): Promise<ActionResult> {
  const viewer = await requireActiveMember();
  const parsed = reportMessageInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(INVALID_INPUT_MESSAGE);
  }
  return reportMessage(viewer.id, {
    messageId: parsed.data.messageId,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });
}
