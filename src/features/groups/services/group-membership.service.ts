import "server-only";

import { recordAudit } from "@/features/audit/services/audit.service";
import { createNotification } from "@/features/notifications/services/notification.service";
import { ROUTES } from "@/constants/routes";
import { db } from "@/lib/db";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import {
  canModerateMember,
  canViewGroup,
  nextStatusForLeave,
  nextStatusForModeration,
  resolveJoin,
  type GroupModerationAction,
} from "../domain/group-rules";

import { isGroupModerator } from "./group-moderation.service";

const GROUP_UNAVAILABLE = "This group is not available.";
const RETRY_MESSAGE = "Your membership changed. Refresh the page and try again.";

export interface JoinOutcome {
  status: "ACTIVE" | "PENDING";
}

/** OPEN groups admit the member at once. REQUEST groups record a pending request for a moderator. */
export async function joinGroup(input: { groupId: string; userId: string }): Promise<ActionResult<JoinOutcome>> {
  const group = await db.group.findUnique({
    where: { id: input.groupId },
    select: { isPrivate: true, joinPolicy: true },
  });
  if (!group) {
    return actionError(GROUP_UNAVAILABLE);
  }

  const existing = await db.groupMembership.findUnique({
    where: { groupId_userId: { groupId: input.groupId, userId: input.userId } },
    select: { status: true },
  });
  if (!canViewGroup(group, existing?.status ?? null)) {
    return actionError(GROUP_UNAVAILABLE);
  }

  const decision = resolveJoin(group.joinPolicy, existing?.status ?? null);
  if (decision.kind === "ALREADY_MEMBER") {
    return actionOk({ status: "ACTIVE" });
  }
  if (decision.kind === "ALREADY_REQUESTED") {
    return actionOk({ status: "PENDING" });
  }

  if (existing) {
    // Only a REMOVED membership is restarted, so two concurrent joins cannot both apply.
    const restarted = await db.groupMembership.updateMany({
      where: { groupId: input.groupId, userId: input.userId, status: "REMOVED" },
      data: { status: decision.status },
    });
    if (restarted.count !== 1) {
      return actionError(RETRY_MESSAGE);
    }
  } else {
    const created = await db.groupMembership.createMany({
      data: [{ groupId: input.groupId, userId: input.userId, status: decision.status }],
      skipDuplicates: true,
    });
    if (created.count !== 1) {
      return actionError(RETRY_MESSAGE);
    }
  }

  return actionOk({ status: decision.status });
}

/** Ends a pending request or an active membership. Idempotent. */
export async function leaveGroup(input: { groupId: string; userId: string }): Promise<ActionResult> {
  const existing = await db.groupMembership.findUnique({
    where: { groupId_userId: { groupId: input.groupId, userId: input.userId } },
    select: { status: true },
  });
  const next = existing ? nextStatusForLeave(existing.status) : null;
  if (!existing || !next) {
    return actionOk();
  }

  await db.groupMembership.updateMany({
    where: { groupId: input.groupId, userId: input.userId, status: existing.status },
    data: { status: next },
  });
  return actionOk();
}

/**
 * Approves a pending request or removes a member. The actor must moderate the group, and the actor cannot
 * moderate their own membership.
 */
export async function moderateGroupMembership(input: {
  actorUserId: string;
  groupId: string;
  targetUserId: string;
  action: GroupModerationAction;
}): Promise<ActionResult> {
  if (!canModerateMember(input.actorUserId, input.targetUserId)) {
    return actionError("Use Leave group to end your own membership.");
  }
  if (!(await isGroupModerator(input.actorUserId, input.groupId))) {
    return actionError("You cannot moderate this group.");
  }

  const [group, target] = await Promise.all([
    db.group.findUnique({ where: { id: input.groupId }, select: { slug: true, name: true } }),
    db.groupMembership.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId: input.targetUserId } },
      select: { status: true },
    }),
  ]);
  if (!group || !target) {
    return actionError("That membership is no longer available.");
  }

  const next = nextStatusForModeration(input.action, target.status);
  if (!next) {
    return actionError("This membership has already changed. Refresh the page.");
  }

  const applied = await db.$transaction(async (tx) => {
    const result = await tx.groupMembership.updateMany({
      where: { groupId: input.groupId, userId: input.targetUserId, status: target.status },
      data: { status: next },
    });
    if (result.count !== 1) {
      return false;
    }

    if (input.action === "APPROVE") {
      await createNotification(tx, {
        userId: input.targetUserId,
        kind: "GROUP",
        title: `Welcome to ${group.name}`,
        body: "Your request to join this group was approved.",
        linkPath: `${ROUTES.appGroups}/${group.slug}`,
      });
    }

    await recordAudit(tx, {
      action: input.action === "APPROVE" ? "group.membership.approved" : "group.membership.removed",
      entityType: "group",
      entityId: input.groupId,
      actorId: input.actorUserId,
      metadata: { targetUserId: input.targetUserId },
    });
    return true;
  });

  return applied ? actionOk() : actionError(RETRY_MESSAGE);
}
