import "server-only";

import { listBlockedUserIds } from "@/features/feed/services/block-lookup.service";
import { db } from "@/lib/db";
import type { GroupKind, GroupMemberRole } from "@/generated/prisma/client";

import { canViewGroup, type GroupJoinPolicy, type GroupMembershipStatus } from "../domain/group-rules";

import { isGroupModerator } from "./group-moderation.service";

export interface GroupSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: GroupKind;
  joinPolicy: GroupJoinPolicy;
  isPrivate: boolean;
  memberCount: number;
  viewerStatus: GroupMembershipStatus | null;
  viewerRole: GroupMemberRole | null;
}

export interface GroupDetail extends GroupSummary {
  isModerator: boolean;
}

export interface GroupMemberView {
  userId: string;
  name: string;
  role: GroupMemberRole;
}

export interface PendingRequestView {
  userId: string;
  name: string;
  requestedAt: Date;
}

const GROUP_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  kind: true,
  joinPolicy: true,
  isPrivate: true,
} as const;

/** Listed groups: every public group, plus private groups where the viewer is an ACTIVE member. */
export async function listGroupsForViewer(userId: string): Promise<GroupSummary[]> {
  const groups = await db.group.findMany({
    where: {
      OR: [{ isPrivate: false }, { isPrivate: true, memberships: { some: { userId, status: "ACTIVE" } } }],
    },
    orderBy: { name: "asc" },
    select: {
      ...GROUP_SELECT,
      memberships: { where: { userId }, select: { status: true, role: true } },
    },
  });
  if (groups.length === 0) {
    return [];
  }

  const counts = await db.groupMembership.groupBy({
    by: ["groupId"],
    where: { groupId: { in: groups.map((group) => group.id) }, status: "ACTIVE" },
    _count: { _all: true },
  });
  const memberCounts = new Map(counts.map((row) => [row.groupId, row._count._all]));

  return groups.map((group) => {
    const membership = group.memberships[0] ?? null;
    return {
      id: group.id,
      slug: group.slug,
      name: group.name,
      description: group.description,
      kind: group.kind,
      joinPolicy: group.joinPolicy,
      isPrivate: group.isPrivate,
      memberCount: memberCounts.get(group.id) ?? 0,
      viewerStatus: membership?.status ?? null,
      viewerRole: membership?.role ?? null,
    };
  });
}

/** Returns the group only when the viewer may see it. Null means "not found" to the caller. */
export async function getGroupForViewer(slug: string, userId: string): Promise<GroupDetail | null> {
  const group = await db.group.findUnique({
    where: { slug },
    select: {
      ...GROUP_SELECT,
      memberships: { where: { userId }, select: { status: true, role: true } },
    },
  });
  if (!group) {
    return null;
  }

  const membership = group.memberships[0] ?? null;
  if (!canViewGroup(group, membership?.status ?? null)) {
    return null;
  }

  const [memberCount, isModerator] = await Promise.all([
    db.groupMembership.count({ where: { groupId: group.id, status: "ACTIVE" } }),
    isGroupModerator(userId, group.id),
  ]);

  return {
    id: group.id,
    slug: group.slug,
    name: group.name,
    description: group.description,
    kind: group.kind,
    joinPolicy: group.joinPolicy,
    isPrivate: group.isPrivate,
    memberCount,
    viewerStatus: membership?.status ?? null,
    viewerRole: membership?.role ?? null,
    isModerator,
  };
}

/** Active members, moderators first. Members who block the viewer, or whom the viewer blocks, are omitted. */
export async function listActiveGroupMembers(groupId: string, viewerId: string): Promise<GroupMemberView[]> {
  const blockedUserIds = await listBlockedUserIds(viewerId);
  const rows = await db.groupMembership.findMany({
    where: { groupId, status: "ACTIVE", userId: { notIn: blockedUserIds } },
    select: { userId: true, role: true, user: { select: { name: true } } },
  });

  return rows
    .map((row) => ({ userId: row.userId, name: row.user.name, role: row.role }))
    .sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === "MODERATOR" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

/** Pending join requests. Callers must have verified moderation rights for the group. */
export async function listPendingRequests(groupId: string): Promise<PendingRequestView[]> {
  const rows = await db.groupMembership.findMany({
    where: { groupId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { userId: true, createdAt: true, user: { select: { name: true } } },
  });
  return rows.map((row) => ({ userId: row.userId, name: row.user.name, requestedAt: row.createdAt }));
}
