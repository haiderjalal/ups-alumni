import "server-only";

import type { DbClient } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";

import {
  deriveConnectionState,
  isActiveConnection,
  type ConnectionViewState,
  type PairSnapshot,
} from "../domain/connection-rules";
import { createPairKey, otherMemberOf } from "../domain/pair-key";

/**
 * Reads the full relationship between two members in one place. Every connection, request and block rule
 * builds on this snapshot. Callers pass a transaction client when the decision must match the write.
 */
export async function loadPairSnapshot(client: DbClient, viewerId: string, otherId: string): Promise<PairSnapshot> {
  const pairKey = createPairKey(viewerId, otherId);
  const [connection, blocks, request] = await Promise.all([
    client.connection.findUnique({ where: { pairKey }, select: { id: true } }),
    client.block.findMany({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: otherId },
          { blockerId: otherId, blockedId: viewerId },
        ],
      },
      select: { blockerId: true },
    }),
    client.connectionRequest.findUnique({
      where: { pairKey },
      select: { id: true, status: true, requesterId: true, addresseeId: true },
    }),
  ]);

  return {
    connected: connection !== null,
    blockedByViewer: blocks.some((block) => block.blockerId === viewerId),
    blockedByOther: blocks.some((block) => block.blockerId === otherId),
    request,
  };
}

/** The state the viewer may see about another member. BLOCKED_BY_OTHER must not be displayed to the viewer. */
export async function getConnectionState(viewerId: string, otherUserId: string): Promise<ConnectionViewState> {
  if (viewerId === otherUserId) {
    return "SELF";
  }
  const pair = await loadPairSnapshot(db, viewerId, otherUserId);
  return deriveConnectionState(viewerId, otherUserId, pair);
}

/** True only for an accepted connection with no block in either direction. */
export async function areConnected(a: string, b: string): Promise<boolean> {
  if (a === b) {
    return false;
  }
  return isActiveConnection(await loadPairSnapshot(db, a, b));
}

export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) {
    return false;
  }
  const block = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return block !== null;
}

/** Every member id that has a block with `userId` in either direction. */
export async function listBlockRelatedUserIds(userId: string): Promise<Set<string>> {
  const blocks = await db.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return new Set(blocks.map((block) => (block.blockerId === userId ? block.blockedId : block.blockerId)));
}

/** Ids of members the user is connected with, excluding any member involved in a block. */
export async function listConnectedUserIds(userId: string): Promise<string[]> {
  const [connections, blockedIds] = await Promise.all([
    db.connection.findMany({
      where: { OR: [{ lowUserId: userId }, { highUserId: userId }] },
      select: { lowUserId: true, highUserId: true },
    }),
    listBlockRelatedUserIds(userId),
  ]);

  return connections
    .map((connection) => otherMemberOf(connection.lowUserId, connection.highUserId, userId))
    .filter((memberId) => !blockedIds.has(memberId));
}
