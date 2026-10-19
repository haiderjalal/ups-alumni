import "server-only";

import { db } from "@/lib/db";

/**
 * Group ids the user may moderate: groups where the user is an ACTIVE moderator, plus groups the user
 * represents through a current GROUP_REPRESENTATIVE assignment. Representatives act only in their own groups.
 */
export async function getGroupModerationScope(userId: string): Promise<string[]> {
  const [moderatorships, representations] = await Promise.all([
    db.groupMembership.findMany({
      where: { userId, role: "MODERATOR", status: "ACTIVE" },
      select: { groupId: true },
    }),
    db.roleAssignment.findMany({
      where: { userId, role: "GROUP_REPRESENTATIVE", revokedAt: null, groupId: { not: null } },
      select: { groupId: true },
    }),
  ]);

  const groupIds = [
    ...moderatorships.map((membership) => membership.groupId),
    ...representations.flatMap((assignment) => (assignment.groupId ? [assignment.groupId] : [])),
  ];
  return [...new Set(groupIds)];
}

export async function isGroupModerator(userId: string, groupId: string): Promise<boolean> {
  const scope = await getGroupModerationScope(userId);
  return scope.includes(groupId);
}
