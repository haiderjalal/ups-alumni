import "server-only";

import { db } from "@/lib/db";

/**
 * Users who block the viewer, or whom the viewer blocks. Content from either side is hidden in both
 * directions. Reads the Block table directly.
 */
export async function listBlockedUserIds(viewerId: string): Promise<string[]> {
  const blocks = await db.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  const otherUserIds = blocks.map((block) => (block.blockerId === viewerId ? block.blockedId : block.blockerId));
  return [...new Set(otherUserIds)];
}

export async function isBlockedBetween(userId: string, otherUserId: string): Promise<boolean> {
  if (userId === otherUserId) {
    return false;
  }
  const count = await db.block.count({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
  });
  return count > 0;
}
