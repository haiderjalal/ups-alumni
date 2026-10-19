"use server";

import { requireActiveMember } from "@/lib/session";
import { actionError, type ActionResult } from "@/types/action";

import { joinGroup, leaveGroup, moderateGroupMembership, type JoinOutcome } from "../services/group-membership.service";
import { groupTargetSchema, moderateMembershipSchema } from "../validation/group.schema";

const GROUP_UNAVAILABLE = "This group is not available.";

export async function joinGroupAction(input: { groupId: string }): Promise<ActionResult<JoinOutcome>> {
  const user = await requireActiveMember();
  const parsed = groupTargetSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(GROUP_UNAVAILABLE);
  }
  return joinGroup({ groupId: parsed.data.groupId, userId: user.id });
}

export async function leaveGroupAction(input: { groupId: string }): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = groupTargetSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(GROUP_UNAVAILABLE);
  }
  return leaveGroup({ groupId: parsed.data.groupId, userId: user.id });
}

export async function moderateMembershipAction(input: {
  groupId: string;
  targetUserId: string;
  action: "APPROVE" | "REMOVE";
}): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = moderateMembershipSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Choose a valid action for this member.");
  }
  return moderateGroupMembership({
    actorUserId: user.id,
    groupId: parsed.data.groupId,
    targetUserId: parsed.data.targetUserId,
    action: parsed.data.action,
  });
}
