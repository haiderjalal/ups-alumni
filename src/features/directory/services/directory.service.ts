import "server-only";

import type { Prisma, ProfessionalStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { canViewContact, type ContactVisibilityLevel } from "@/features/profile/domain/visibility";

export const DIRECTORY_PAGE_SIZE = 12;

export interface DirectoryFilters {
  q?: string;
  batchYear?: number;
  city?: string;
  industry?: string;
  status?: ProfessionalStatus;
  skill?: string;
  mentorsOnly?: boolean;
  hiringOnly?: boolean;
  sort?: "name" | "batch_desc" | "batch_asc";
  page?: number;
}

/** What a directory card may show. Deliberately has no email, phone, roll number or school memory fields. */
export interface DirectoryCard {
  publicId: string;
  name: string;
  batchYear: number | null;
  city: string | null;
  headline: string;
  hasPhoto: boolean;
  mentor: boolean;
  hiring: boolean;
}

/** IDs of users a viewer must not see: anyone who blocked the viewer, and anyone the viewer blocked. */
export async function blockedUserIdsFor(viewerId: string): Promise<string[]> {
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(rows.map((row) => (row.blockerId === viewerId ? row.blockedId : row.blockerId)))];
}

function headlineFor(statuses: readonly ProfessionalStatus[], jobTitle: string | null, organization: string | null, institution: string | null): string {
  if (jobTitle && organization) return `${jobTitle} at ${organization}`;
  if (jobTitle) return jobTitle;
  if (institution && statuses.includes("STUDENT")) return `Student at ${institution}`;
  if (statuses.includes("BUSINESS_OWNER")) return "Business owner";
  if (statuses.includes("SELF_EMPLOYED_FREELANCER")) return "Freelancer";
  if (statuses.includes("SEEKING_OPPORTUNITIES")) return "Open to opportunities";
  return "Alumni";
}

/**
 * Searches discoverable, active members. Every condition runs in the database, so hidden profiles never leave it.
 * Blocked pairs are excluded in both directions, and the viewer never sees their own card.
 */
export async function searchDirectory(viewerId: string, filters: DirectoryFilters): Promise<{ cards: DirectoryCard[]; total: number }> {
  const blocked = await blockedUserIdsFor(viewerId);
  const excludedIds = [viewerId, ...blocked];

  const profileWhere: Prisma.AlumniProfileWhereInput = {
    directoryDiscoverable: true,
    user: { id: { notIn: excludedIds }, membership: { status: "ACTIVE" } },
    ...(filters.batchYear ? { matricYear: filters.batchYear } : {}),
    ...(filters.city ? { currentCity: { contains: filters.city, mode: "insensitive" } } : {}),
    ...(filters.industry ? { industry: { contains: filters.industry, mode: "insensitive" } } : {}),
    ...(filters.status ? { professionalStatuses: { has: filters.status } } : {}),
    ...(filters.mentorsOnly ? { availableToMentor: true } : {}),
    ...(filters.hiringOnly ? { hiring: true } : {}),
    ...(filters.skill
      ? { skills: { some: { skill: { name: { contains: filters.skill, mode: "insensitive" } } } } }
      : {}),
  };

  if (filters.q) {
    const term = filters.q.trim();
    profileWhere.OR = [
      { user: { name: { contains: term, mode: "insensitive" } } },
      { jobTitle: { contains: term, mode: "insensitive" } },
      { organization: { contains: term, mode: "insensitive" } },
      { industry: { contains: term, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.AlumniProfileOrderByWithRelationInput[] =
    filters.sort === "batch_desc"
      ? [{ matricYear: "desc" }, { user: { name: "asc" } }]
      : filters.sort === "batch_asc"
        ? [{ matricYear: "asc" }, { user: { name: "asc" } }]
        : [{ user: { name: "asc" } }];

  const page = Math.max(1, filters.page ?? 1);
  const [rows, total] = await Promise.all([
    db.alumniProfile.findMany({
      where: profileWhere,
      orderBy,
      skip: (page - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE,
      select: {
        publicId: true,
        matricYear: true,
        currentCity: true,
        professionalStatuses: true,
        jobTitle: true,
        organization: true,
        institution: true,
        photoMediaId: true,
        availableToMentor: true,
        hiring: true,
        user: { select: { name: true } },
      },
    }),
    db.alumniProfile.count({ where: profileWhere }),
  ]);

  return {
    total,
    cards: rows.map((row) => ({
      publicId: row.publicId,
      name: row.user.name,
      batchYear: row.matricYear,
      city: row.currentCity,
      headline: headlineFor(row.professionalStatuses, row.jobTitle, row.organization, row.institution),
      hasPhoto: row.photoMediaId !== null,
      mentor: row.availableToMentor,
      hiring: row.hiring,
    })),
  };
}

export interface MemberProfileView {
  publicId: string;
  name: string;
  batchYear: number | null;
  city: string | null;
  country: string | null;
  headline: string;
  bio: string | null;
  professionalStatuses: ProfessionalStatus[];
  organization: string | null;
  skills: string[];
  interests: string[];
  mentor: boolean;
  hiring: boolean;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isOwn: boolean;
}

/**
 * Detailed profile for one member. Returns null when the member is hidden, blocked or inactive, so the page can
 * respond with "not found" without revealing which case applies. Contact fields follow each owner's visibility choice.
 */
export async function getMemberProfileView(viewerId: string, publicId: string, viewerIsStaff: boolean): Promise<MemberProfileView | null> {
  const blocked = await blockedUserIdsFor(viewerId);
  const profile = await db.alumniProfile.findUnique({
    where: { publicId },
    select: {
      userId: true,
      publicId: true,
      directoryDiscoverable: true,
      matricYear: true,
      currentCity: true,
      currentCountry: true,
      bio: true,
      professionalStatuses: true,
      jobTitle: true,
      organization: true,
      institution: true,
      interests: true,
      availableToMentor: true,
      hiring: true,
      phoneE164: true,
      linkedinUrl: true,
      contactVisibility: { select: { email: true, phone: true, linkedin: true } },
      skills: { select: { skill: { select: { name: true } } } },
      user: { select: { name: true, email: true, membership: { select: { status: true } } } },
    },
  });

  if (!profile || !profile.directoryDiscoverable || profile.user.membership?.status !== "ACTIVE") {
    return null;
  }
  const isOwn = profile.userId === viewerId;
  if (!isOwn && blocked.includes(profile.userId)) {
    return null;
  }

  const viewerIsActiveMember = await db.membership.count({ where: { userId: viewerId, status: "ACTIVE" } }).then((count) => count > 0);
  const connected = isOwn ? false : await isAcceptedConnection(viewerId, profile.userId);
  const viewer = { viewerId, isActiveMember: viewerIsActiveMember, isConnectedToOwner: connected, isMembershipStaff: viewerIsStaff };
  const visibility = profile.contactVisibility;
  const levelFor = (value: string | undefined): ContactVisibilityLevel => (value === "CONNECTIONS" || value === "MEMBERS" ? value : "PRIVATE");

  const showEmail = canViewContact(profile.userId, levelFor(visibility?.email), viewer);
  const showPhone = canViewContact(profile.userId, levelFor(visibility?.phone), viewer);
  const showLinkedin = canViewContact(profile.userId, levelFor(visibility?.linkedin), viewer);

  return {
    publicId: profile.publicId,
    name: profile.user.name,
    batchYear: profile.matricYear,
    city: profile.currentCity,
    country: profile.currentCountry,
    headline: headlineFor(profile.professionalStatuses, profile.jobTitle, profile.organization, profile.institution),
    bio: profile.bio,
    professionalStatuses: [...profile.professionalStatuses],
    organization: profile.organization,
    skills: profile.skills.map((link) => link.skill.name),
    interests: [...profile.interests],
    mentor: profile.availableToMentor,
    hiring: profile.hiring,
    email: showEmail ? profile.user.email : null,
    phone: showPhone ? profile.phoneE164 : null,
    linkedinUrl: showLinkedin ? profile.linkedinUrl : null,
    isOwn,
  };
}

async function isAcceptedConnection(a: string, b: string): Promise<boolean> {
  const [low, high] = a < b ? [a, b] : [b, a];
  const count = await db.connection.count({ where: { lowUserId: low, highUserId: high } });
  return count > 0;
}

/** Discoverable member counts per batch. Counts are shown only to active members, and hidden profiles are not counted. */
export async function countDiscoverableByBatch(): Promise<Map<number, number>> {
  const rows = await db.alumniProfile.groupBy({
    by: ["matricYear"],
    where: { directoryDiscoverable: true, matricYear: { not: null }, user: { membership: { status: "ACTIVE" } } },
    _count: { _all: true },
  });
  return new Map(rows.flatMap((row) => (row.matricYear === null ? [] : [[row.matricYear, row._count._all] as const])));
}
