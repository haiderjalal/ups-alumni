import "server-only";

import { recordAudit } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { createPairKey } from "../domain/pair-key";

import { isUniqueViolation } from "./db-errors";
import { buildMemberSummary, MEMBER_SUMMARY_SELECT, type MemberSummary } from "./member-summary";
import { acquireTransactionLock, pairLockKey } from "./pair-lock";

const BLOCK_FAILURE = "We could not update this block right now. Please try again shortly.";
const SELF_BLOCK_MESSAGE = "You cannot block yourself.";
const MEMBER_NOT_FOUND_MESSAGE = "This member could not be found.";
const BLOCKED_LIST_LIMIT = 200;

/**
 * Blocks another member in both directions: no requests, messages or notifications while the block stands.
 * Pending requests between the pair are withdrawn. An accepted connection stays in place but is inactive
 * until the block is removed.
 */
export async function blockMember(blockerId: string, blockedId: string): Promise<ActionResult> {
  if (blockerId === blockedId) {
    return actionError(SELF_BLOCK_MESSAGE);
  }
  const pairKey = createPairKey(blockerId, blockedId);
  try {
    return await db.$transaction(async (tx): Promise<ActionResult> => {
      await acquireTransactionLock(tx, pairLockKey(pairKey));

      const target = await tx.user.findUnique({ where: { id: blockedId }, select: { id: true } });
      if (!target) {
        return actionError(MEMBER_NOT_FOUND_MESSAGE);
      }

      const existing = await tx.block.findUnique({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        select: { id: true },
      });
      if (!existing) {
        const created = await tx.block.create({ data: { blockerId, blockedId }, select: { id: true } });
        await recordAudit(tx, {
          action: "block.created",
          entityType: "block",
          entityId: created.id,
          actorId: blockerId,
        });
      }

      await tx.connectionRequest.updateMany({
        where: { pairKey, status: "PENDING" },
        data: { status: "WITHDRAWN", respondedAt: new Date() },
      });
      return actionOk();
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionOk();
    }
    log("error", "block.create_failed", { blockerId, blockedId, error });
    return actionError(BLOCK_FAILURE);
  }
}

export async function unblockMember(blockerId: string, blockedId: string): Promise<ActionResult> {
  if (blockerId === blockedId) {
    return actionOk();
  }
  const pairKey = createPairKey(blockerId, blockedId);
  try {
    return await db.$transaction(async (tx): Promise<ActionResult> => {
      await acquireTransactionLock(tx, pairLockKey(pairKey));

      const existing = await tx.block.findUnique({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        select: { id: true },
      });
      if (!existing) {
        return actionOk();
      }
      await tx.block.delete({ where: { id: existing.id } });
      await recordAudit(tx, {
        action: "block.removed",
        entityType: "block",
        entityId: existing.id,
        actorId: blockerId,
      });
      return actionOk();
    });
  } catch (error) {
    log("error", "block.remove_failed", { blockerId, blockedId, error });
    return actionError(BLOCK_FAILURE);
  }
}

/** Blocked members are listed even when inactive, so the blocker can always lift a block they placed. */
export async function listBlockedMembers(blockerId: string): Promise<MemberSummary[]> {
  const rows = await db.block.findMany({
    where: { blockerId },
    orderBy: { createdAt: "desc" },
    take: BLOCKED_LIST_LIMIT,
    select: { blocked: { select: MEMBER_SUMMARY_SELECT } },
  });
  return rows.map((row) => buildMemberSummary(row.blocked));
}
