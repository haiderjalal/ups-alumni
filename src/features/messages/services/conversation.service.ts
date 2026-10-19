import "server-only";

import { isUniqueViolation } from "@/features/connections/services/db-errors";
import { buildMemberSummary, isActiveMemberRow, MEMBER_SUMMARY_SELECT, type MemberSummary } from "@/features/connections/services/member-summary";
import { acquireTransactionLock, pairLockKey } from "@/features/connections/services/pair-lock";
import { createPairKey, otherMemberFromPairKey } from "@/features/connections/domain/pair-key";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { evaluateMessagingAccess } from "../domain/messaging-access";
import { isConversationUnread } from "../domain/read-state";

import { assertMessagingAccess, getMessagingDenial } from "./messaging-access.service";

const CONVERSATION_LIST_LIMIT = 50;
const PREVIEW_CHARACTERS = 120;
const OPEN_FAILURE_MESSAGE = "We could not open this conversation right now. Please try again shortly.";
const UNAVAILABLE_MESSAGE = "This conversation is not available.";
const SELF_MESSAGE = "You cannot start a conversation with yourself.";

export interface ConversationContext {
  conversationId: string;
  other: MemberSummary;
}

export interface ConversationListItem {
  id: string;
  other: MemberSummary;
  preview: string | null;
  previewIsOwn: boolean;
  lastMessageAt: string | null;
  unread: boolean;
}

function previewOf(body: string): string {
  const characters = Array.from(body);
  return characters.length > PREVIEW_CHARACTERS ? `${characters.slice(0, PREVIEW_CHARACTERS).join("")}…` : body;
}

/**
 * Returns the one direct conversation for a pair, creating it when the members may message each other.
 * Runs under the pair lock so two concurrent opens cannot create two conversations.
 */
export async function openConversation(viewerId: string, memberId: string): Promise<ActionResult<{ conversationId: string }>> {
  if (viewerId === memberId) {
    return actionError(SELF_MESSAGE);
  }
  const pairKey = createPairKey(viewerId, memberId);
  try {
    return await db.$transaction(async (tx): Promise<ActionResult<{ conversationId: string }>> => {
      await acquireTransactionLock(tx, pairLockKey(pairKey));

      const access = await assertMessagingAccess(tx, viewerId, memberId);
      if (!access.ok) {
        return access;
      }

      const existing = await tx.conversation.findUnique({ where: { pairKey }, select: { id: true } });
      if (existing) {
        return actionOk({ conversationId: existing.id });
      }

      const created = await tx.conversation.create({
        data: {
          pairKey,
          participants: { create: [{ userId: viewerId }, { userId: memberId }] },
        },
        select: { id: true },
      });
      return actionOk({ conversationId: created.id });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionError(OPEN_FAILURE_MESSAGE);
    }
    log("error", "conversation.open_failed", { viewerId, memberId, error });
    return actionError(OPEN_FAILURE_MESSAGE);
  }
}

/** Returns the conversation only when the viewer is a participant and messaging is currently allowed. */
export async function getConversationForViewer(
  viewerId: string,
  conversationId: string,
): Promise<ConversationContext | null> {
  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    select: { conversation: { select: { id: true, pairKey: true } } },
  });
  if (!participant) {
    return null;
  }

  const otherId = otherMemberFromPairKey(participant.conversation.pairKey, viewerId);
  if (!otherId) {
    return null;
  }
  const denial = await getMessagingDenial(db, viewerId, otherId);
  if (denial !== null) {
    return null;
  }

  const member = await db.user.findUnique({ where: { id: otherId }, select: MEMBER_SUMMARY_SELECT });
  if (!member) {
    return null;
  }
  return { conversationId: participant.conversation.id, other: buildMemberSummary(member) };
}

/**
 * Conversations the viewer may still use, newest first. Connections, blocks and member status are read in
 * batches so the list costs a fixed number of queries. Callers verify an active viewer membership.
 */
export async function listConversationsForViewer(viewerId: string): Promise<ConversationListItem[]> {
  const rows = await db.conversationParticipant.findMany({
    where: { userId: viewerId },
    orderBy: { conversation: { lastMessageAt: { sort: "desc", nulls: "last" } } },
    take: CONVERSATION_LIST_LIMIT,
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          pairKey: true,
          lastMessageAt: true,
          messages: {
            where: { deletedAt: null },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 1,
            select: { senderId: true, body: true, createdAt: true },
          },
        },
      },
    },
  });

  const entries = rows.flatMap((row) => {
    const otherId = otherMemberFromPairKey(row.conversation.pairKey, viewerId);
    return otherId ? [{ row, otherId }] : [];
  });
  if (entries.length === 0) {
    return [];
  }

  const otherIds = [...new Set(entries.map((entry) => entry.otherId))];
  const pairKeys = entries.map((entry) => entry.row.conversation.pairKey);
  const [connections, blocks, members] = await Promise.all([
    db.connection.findMany({ where: { pairKey: { in: pairKeys } }, select: { pairKey: true } }),
    db.block.findMany({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: { in: otherIds } },
          { blockerId: { in: otherIds }, blockedId: viewerId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    }),
    db.user.findMany({ where: { id: { in: otherIds } }, select: MEMBER_SUMMARY_SELECT }),
  ]);

  const connectedPairs = new Set(connections.map((connection) => connection.pairKey));
  const blockedMemberIds = new Set(
    blocks.map((block) => (block.blockerId === viewerId ? block.blockedId : block.blockerId)),
  );
  const membersById = new Map(members.map((member) => [member.id, member]));

  return entries.flatMap(({ row, otherId }) => {
    const memberRow = membersById.get(otherId);
    const summary = memberRow && isActiveMemberRow(memberRow) ? buildMemberSummary(memberRow) : null;
    const denial = evaluateMessagingAccess({
      viewerActive: true,
      otherActive: summary !== null,
      connected: connectedPairs.has(row.conversation.pairKey),
      blocked: blockedMemberIds.has(otherId),
    });
    if (denial !== null || summary === null) {
      return [];
    }

    const latest = row.conversation.messages[0] ?? null;
    return [
      {
        id: row.conversation.id,
        other: summary,
        preview: latest ? previewOf(latest.body) : null,
        previewIsOwn: latest?.senderId === viewerId,
        lastMessageAt: row.conversation.lastMessageAt?.toISOString() ?? null,
        unread: isConversationUnread({ viewerId, lastReadAt: row.lastReadAt, latest }),
      },
    ];
  });
}

/** Moves the viewer's read marker forward only. A future timestamp is clamped to now. */
export async function markConversationRead(viewerId: string, conversationId: string, readThrough: Date): Promise<void> {
  const now = new Date();
  const readAt = readThrough.getTime() > now.getTime() ? now : readThrough;
  await db.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId: viewerId,
      OR: [{ lastReadAt: null }, { lastReadAt: { lt: readAt } }],
    },
    data: { lastReadAt: readAt },
  });
}

export async function requireConversationAccess(
  viewerId: string,
  conversationId: string,
): Promise<ActionResult<ConversationContext>> {
  const context = await getConversationForViewer(viewerId, conversationId);
  return context ? actionOk(context) : actionError(UNAVAILABLE_MESSAGE);
}
