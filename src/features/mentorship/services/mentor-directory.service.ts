import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { isBlockedBetween } from "@/features/connections/services/connection.service";
import { db } from "@/lib/db";

import { MENTORSHIP_PAGE_SIZE } from "../constants";
import {
  canRequestMentor,
  evaluateMentorCapacity,
} from "../domain/mentorship-rules";
import type { MentorSearchQuery } from "../validation/mentorship.schema";

export interface MentorCard {
  profileId: string;
  name: string;
  expertise: string;
  topics: string[];
  languages: string[];
  availability: string;
  remaining: number;
  acceptingRequests: boolean;
}

export interface MentorPage {
  items: MentorCard[];
  total: number;
  page: number;
  pageCount: number;
}

export interface MentorDetail extends MentorCard {
  capacity: number;
  isSelf: boolean;
  canRequest: boolean;
  hasPendingRequest: boolean;
  hasActiveMentorship: boolean;
}

const INSENSITIVE = "insensitive" as const;

/**
 * Active mentors, excluding the viewer and anyone blocked in either direction. Mentors who are at
 * capacity still appear, marked as not accepting requests.
 */
export async function searchActiveMentors(
  viewerId: string,
  query: MentorSearchQuery,
): Promise<MentorPage> {
  const blockedIds = await listBlockedUserIds(viewerId);
  const where: Prisma.MentorProfileWhereInput = {
    isActive: true,
    userId: { notIn: [viewerId, ...blockedIds] },
    ...(query.topic ? { topics: { has: query.topic } } : {}),
    ...(query.q ? { expertise: { contains: query.q, mode: INSENSITIVE } } : {}),
  };

  const total = await db.mentorProfile.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / MENTORSHIP_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);

  const rows = await db.mentorProfile.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * MENTORSHIP_PAGE_SIZE,
    take: MENTORSHIP_PAGE_SIZE,
    select: {
      id: true,
      userId: true,
      expertise: true,
      topics: true,
      languages: true,
      availability: true,
      capacity: true,
      user: { select: { name: true } },
    },
  });

  const activeCounts = await countActiveMentorships(
    rows.map((row) => row.userId),
  );
  const items = rows.map((row) => {
    const decision = evaluateMentorCapacity({
      capacity: row.capacity,
      activeCount: activeCounts.get(row.userId) ?? 0,
    });
    return {
      profileId: row.id,
      name: row.user.name,
      expertise: row.expertise,
      topics: row.topics,
      languages: row.languages,
      availability: row.availability,
      remaining: decision.remaining,
      acceptingRequests: decision.allowed,
    };
  });

  return { items, total, page, pageCount };
}

/**
 * One mentor profile for the viewer. Inactive profiles and profiles blocked with the viewer are not
 * shown. The mentor's own profile is shown with no request actions.
 */
export async function getMentorForViewer(
  profileId: string,
  viewerId: string,
): Promise<MentorDetail | null> {
  const profile = await db.mentorProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      userId: true,
      isActive: true,
      expertise: true,
      topics: true,
      languages: true,
      availability: true,
      capacity: true,
      user: { select: { name: true } },
    },
  });
  if (!profile) {
    return null;
  }

  const isSelf = profile.userId === viewerId;
  if (!isSelf && !profile.isActive) {
    return null;
  }
  if (!isSelf && (await isBlockedBetween(viewerId, profile.userId))) {
    return null;
  }

  const activeCount = await db.mentorship.count({
    where: { mentorId: profile.userId, status: "ACTIVE" },
  });
  const decision = evaluateMentorCapacity({
    capacity: profile.capacity,
    activeCount,
  });

  let hasPendingRequest = false;
  let hasActiveMentorship = false;
  if (!isSelf) {
    const [pending, active] = await Promise.all([
      db.mentorshipRequest.findFirst({
        where: {
          mentorId: profile.userId,
          menteeId: viewerId,
          status: "PENDING",
        },
        select: { id: true },
      }),
      db.mentorship.findFirst({
        where: {
          mentorId: profile.userId,
          menteeId: viewerId,
          status: "ACTIVE",
        },
        select: { id: true },
      }),
    ]);
    hasPendingRequest = pending !== null;
    hasActiveMentorship = active !== null;
  }

  return {
    profileId: profile.id,
    name: profile.user.name,
    expertise: profile.expertise,
    topics: profile.topics,
    languages: profile.languages,
    availability: profile.availability,
    capacity: profile.capacity,
    remaining: decision.remaining,
    acceptingRequests: profile.isActive && decision.allowed,
    isSelf,
    canRequest:
      canRequestMentor({
        requesterId: viewerId,
        mentorUserId: profile.userId,
        mentorIsActive: profile.isActive,
      }) &&
      !hasPendingRequest &&
      !hasActiveMentorship,
    hasPendingRequest,
    hasActiveMentorship,
  };
}

async function countActiveMentorships(
  mentorIds: string[],
): Promise<Map<string, number>> {
  const groups = await db.mentorship.groupBy({
    by: ["mentorId"],
    where: { mentorId: { in: mentorIds }, status: "ACTIVE" },
    _count: { _all: true },
  });
  return new Map(groups.map((group) => [group.mentorId, group._count._all]));
}

/**
 * Users blocked with the viewer in either direction. Used to filter search results in one query. Single
 * pair checks go through isBlockedBetween.
 */
async function listBlockedUserIds(userId: string): Promise<string[]> {
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return rows.map((row) =>
    row.blockerId === userId ? row.blockedId : row.blockerId,
  );
}
