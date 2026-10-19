import "server-only";

import { otherMemberFromPairKey } from "@/features/connections/domain/pair-key";
import { isUniqueViolation } from "@/features/connections/services/db-errors";
import { acquireTransactionLock, pairLockKey, senderLockKey } from "@/features/connections/services/pair-lock";
import { toReportReason } from "@/features/connections/services/member-report.service";
import { createReport } from "@/features/reports/services/report.service";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { cleanText } from "@/lib/security/text";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { evaluateMessageBody, evaluateMessageRate, MESSAGE_NEWER_BATCH_SIZE, MESSAGE_PAGE_SIZE, messageRateWindowStart } from "../domain/message-rules";

import { getMessagingDenial, messagingDenialMessage } from "./messaging-access.service";
import { markConversationRead, requireConversationAccess } from "./conversation.service";

const UNAVAILABLE_MESSAGE = "This conversation is not available.";
const SEND_FAILURE_MESSAGE = "Your message could not be sent. Your text is still here, so you can try again.";
const RATE_LIMIT_MESSAGE = "You have sent many messages recently. Wait a few minutes before sending more.";
const EMPTY_BODY_MESSAGE = "Write a message before sending.";
const TOO_LONG_BODY_MESSAGE = "Keep messages to 2000 characters or fewer.";
const OWN_MESSAGE_REPORT_MESSAGE = "You cannot report your own message.";
const REASON_REQUIRED_MESSAGE = "Choose a reason for the report.";

export interface MessageView {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

/** Position of one message in the thread. Ordering is (createdAt, id), so equal timestamps stay stable. */
export interface MessageCursor {
  createdAt: string;
  id: string;
}

export interface MessagePage {
  /** Oldest first. */
  messages: MessageView[];
  /** True when older messages exist beyond this page. */
  hasMore: boolean;
}

const MESSAGE_SELECT = { id: true, senderId: true, body: true, createdAt: true } as const;

type MessageRow = { id: string; senderId: string; body: string; createdAt: Date };

function toView(row: MessageRow): MessageView {
  return { id: row.id, senderId: row.senderId, body: row.body, createdAt: row.createdAt.toISOString() };
}

function afterCursorWhere(cursor: MessageCursor) {
  const createdAt = new Date(cursor.createdAt);
  return {
    OR: [{ createdAt: { gt: createdAt } }, { createdAt, id: { gt: cursor.id } }],
  };
}

function beforeCursorWhere(cursor: MessageCursor) {
  const createdAt = new Date(cursor.createdAt);
  return {
    OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: cursor.id } }],
  };
}

/**
 * Stores one message. Under the pair lock and then the sender lock, the access check, the rate window and the
 * insert all see the same state, so a block or a burst of sends cannot slip past the rules.
 */
export async function sendMessage(
  senderId: string,
  input: { conversationId: string; body: string },
): Promise<ActionResult<{ message: MessageView }>> {
  const cleaned = cleanText(input.body);
  const bodyCheck = evaluateMessageBody(cleaned);
  if (!bodyCheck.ok) {
    return actionError(bodyCheck.problem === "EMPTY" ? EMPTY_BODY_MESSAGE : TOO_LONG_BODY_MESSAGE);
  }

  try {
    return await db.$transaction(async (tx): Promise<ActionResult<{ message: MessageView }>> => {
      const participant = await tx.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: senderId } },
        select: { conversation: { select: { id: true, pairKey: true } } },
      });
      if (!participant) {
        return actionError(UNAVAILABLE_MESSAGE);
      }
      const { id: conversationId, pairKey } = participant.conversation;

      await acquireTransactionLock(tx, pairLockKey(pairKey));

      const otherId = otherMemberFromPairKey(pairKey, senderId);
      if (!otherId) {
        return actionError(UNAVAILABLE_MESSAGE);
      }
      const denial = await getMessagingDenial(tx, senderId, otherId);
      if (denial !== null) {
        return actionError(messagingDenialMessage(denial));
      }

      await acquireTransactionLock(tx, senderLockKey(senderId));

      const now = new Date();
      const sentInWindow = await tx.message.count({
        where: { senderId, createdAt: { gte: messageRateWindowStart(now) } },
      });
      if (!evaluateMessageRate(sentInWindow).allowed) {
        return actionError(RATE_LIMIT_MESSAGE);
      }

      const message = await tx.message.create({
        data: { conversationId, senderId, body: cleaned, createdAt: now },
        select: MESSAGE_SELECT,
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });
      return actionOk({ message: toView(message) });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionError(SEND_FAILURE_MESSAGE);
    }
    log("error", "message.send_failed", { senderId, conversationId: input.conversationId, error });
    return actionError(SEND_FAILURE_MESSAGE);
  }
}

/** The newest page of a thread, or an older page when a cursor is given. */
export async function loadMessagePage(
  viewerId: string,
  conversationId: string,
  before: MessageCursor | null,
): Promise<ActionResult<MessagePage>> {
  const access = await requireConversationAccess(viewerId, conversationId);
  if (!access.ok) {
    return access;
  }

  const rows = await db.message.findMany({
    where: { conversationId, deletedAt: null, ...(before ? beforeCursorWhere(before) : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MESSAGE_PAGE_SIZE + 1,
    select: MESSAGE_SELECT,
  });
  const hasMore = rows.length > MESSAGE_PAGE_SIZE;
  const page = rows.slice(0, MESSAGE_PAGE_SIZE).reverse();
  return actionOk({ messages: page.map(toView), hasMore });
}

/**
 * Messages written after the cursor, oldest first. Marks the thread read through the newest message returned,
 * so a message that arrives after this call is still counted as unread.
 */
export async function loadNewerMessages(
  viewerId: string,
  conversationId: string,
  after: MessageCursor | null,
): Promise<ActionResult<{ messages: MessageView[] }>> {
  const access = await requireConversationAccess(viewerId, conversationId);
  if (!access.ok) {
    return access;
  }

  const rows = await db.message.findMany({
    where: { conversationId, deletedAt: null, ...(after ? afterCursorWhere(after) : {}) },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MESSAGE_NEWER_BATCH_SIZE,
    select: MESSAGE_SELECT,
  });

  const newest = rows[rows.length - 1];
  if (newest) {
    await markConversationRead(viewerId, conversationId, newest.createdAt);
  }
  return actionOk({ messages: rows.map(toView) });
}

/** Files a report against a message the viewer received. Reporting does not require the thread to stay open. */
export async function reportMessage(
  reporterId: string,
  input: { messageId: string; reason: string; details?: string },
): Promise<ActionResult> {
  const reason = toReportReason(input.reason);
  if (!reason) {
    return actionError(REASON_REQUIRED_MESSAGE);
  }

  const message = await db.message.findUnique({
    where: { id: input.messageId },
    select: { senderId: true, conversation: { select: { pairKey: true } } },
  });
  if (!message) {
    return actionError(UNAVAILABLE_MESSAGE);
  }
  if (message.senderId === reporterId) {
    return actionError(OWN_MESSAGE_REPORT_MESSAGE);
  }
  // The reporter must be the other participant of the conversation that holds this message.
  if (otherMemberFromPairKey(message.conversation.pairKey, reporterId) !== message.senderId) {
    return actionError(UNAVAILABLE_MESSAGE);
  }

  const result = await createReport(reporterId, {
    targetType: "MESSAGE",
    targetId: input.messageId,
    reason,
    details: input.details?.trim() ? input.details : undefined,
  });
  return result.ok ? actionOk() : actionError(result.message);
}
