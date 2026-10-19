import "server-only";

import { db } from "@/lib/db";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { canParticipate } from "../domain/feed-visibility";

import { loadPostAccess } from "./feed-access.service";

/**
 * Toggles the member's single reaction on a post. The composite key allows one row per member and post.
 * Deleting first makes a repeated click remove the reaction, and a concurrent duplicate insert is skipped.
 */
export async function toggleFeedReaction(input: {
  userId: string;
  postId: string;
}): Promise<ActionResult<{ reacted: boolean }>> {
  const found = await loadPostAccess({ postId: input.postId, userId: input.userId });
  if (!found || !canParticipate(found.access.scope, found.access.viewer) || found.post.status !== "VISIBLE") {
    return actionError("This post is not available.");
  }

  const removed = await db.reaction.deleteMany({ where: { postId: input.postId, userId: input.userId } });
  if (removed.count > 0) {
    return actionOk({ reacted: false });
  }

  await db.reaction.createMany({
    data: [{ postId: input.postId, userId: input.userId }],
    skipDuplicates: true,
  });
  return actionOk({ reacted: true });
}
