import "server-only";

import { createReport, type ReportInput } from "@/features/reports/services/report.service";
import { db } from "@/lib/db";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { loadPostAccess } from "./feed-access.service";

/**
 * Files a report on a post or comment the reporter can see. Visibility is checked first, so a report
 * cannot be filed against content that is hidden from the reporter.
 */
export async function reportFeedContent(input: {
  reporterId: string;
  report: ReportInput & { targetType: "POST" | "COMMENT" };
}): Promise<ActionResult<{ alreadyOpen: boolean }>> {
  const postId = await resolvePostId(input.report.targetType, input.report.targetId);
  if (!postId) {
    return actionError("This content is not available.");
  }
  const found = await loadPostAccess({ postId, userId: input.reporterId });
  if (!found) {
    return actionError("This content is not available.");
  }

  const result = await createReport(input.reporterId, input.report);
  return result.ok ? actionOk({ alreadyOpen: result.alreadyOpen }) : actionError(result.message);
}

async function resolvePostId(targetType: "POST" | "COMMENT", targetId: string): Promise<string | null> {
  if (targetType === "POST") {
    const post = await db.post.findUnique({ where: { id: targetId }, select: { id: true } });
    return post?.id ?? null;
  }
  const comment = await db.comment.findUnique({ where: { id: targetId }, select: { postId: true } });
  return comment?.postId ?? null;
}
