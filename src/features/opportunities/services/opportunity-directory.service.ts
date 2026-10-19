import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import {
  OPPORTUNITY_PAGE_SIZE,
  type OpportunityCategoryValue,
  type RemoteTypeValue,
} from "../constants";
import {
  canViewOpportunity,
  isOpportunityLive,
  parseApplicationUrl,
  type OpportunityStatus,
} from "../domain/opportunity-rules";
import type { OpportunityQuery } from "../validation/opportunity.schema";

export interface OpportunityCard {
  id: string;
  title: string;
  organization: string;
  category: OpportunityCategoryValue;
  remoteType: RemoteTypeValue;
  locationCity: string | null;
  deadline: Date | null;
  saved: boolean;
}

export interface OpportunityPage {
  items: OpportunityCard[];
  total: number;
  page: number;
  pageCount: number;
}

export interface OpportunityDetail {
  id: string;
  title: string;
  organization: string;
  category: OpportunityCategoryValue;
  remoteType: RemoteTypeValue;
  locationCity: string | null;
  description: string;
  applicationUrl: string | null;
  deadline: Date | null;
  status: OpportunityStatus;
  isPoster: boolean;
  isLive: boolean;
  saved: boolean;
  postedByName: string;
}

const INSENSITIVE = "insensitive" as const;

/** Published, and either open-ended or with a deadline still in the future. */
function liveWhere(now: Date): Prisma.OpportunityWhereInput {
  return {
    status: "PUBLISHED",
    OR: [{ deadline: null }, { deadline: { gt: now } }],
  };
}

function filterClauses(
  viewerId: string,
  query: OpportunityQuery,
): Prisma.OpportunityWhereInput[] {
  const clauses: Prisma.OpportunityWhereInput[] = [];
  if (query.q) {
    clauses.push({
      OR: [
        { title: { contains: query.q, mode: INSENSITIVE } },
        { organization: { contains: query.q, mode: INSENSITIVE } },
      ],
    });
  }
  if (query.category) {
    clauses.push({ category: query.category });
  }
  if (query.remoteType) {
    clauses.push({ remoteType: query.remoteType });
  }
  if (query.savedOnly) {
    clauses.push({ saves: { some: { userId: viewerId } } });
  }
  return clauses;
}

/** Live opportunities only. Expired, pending, rejected and closed items never appear here. */
export async function listLiveOpportunities(
  viewerId: string,
  query: OpportunityQuery,
  now: Date = new Date(),
): Promise<OpportunityPage> {
  const where: Prisma.OpportunityWhereInput = {
    AND: [liveWhere(now), ...filterClauses(viewerId, query)],
  };

  const total = await db.opportunity.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / OPPORTUNITY_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);

  const rows = await db.opportunity.findMany({
    where,
    orderBy: [
      { deadline: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "asc" },
    ],
    skip: (page - 1) * OPPORTUNITY_PAGE_SIZE,
    take: OPPORTUNITY_PAGE_SIZE,
    select: {
      id: true,
      title: true,
      organization: true,
      category: true,
      remoteType: true,
      locationCity: true,
      deadline: true,
    },
  });

  const saved = await db.savedOpportunity.findMany({
    where: {
      userId: viewerId,
      opportunityId: { in: rows.map((row) => row.id) },
    },
    select: { opportunityId: true },
  });
  const savedIds = new Set(saved.map((row) => row.opportunityId));

  return {
    items: rows.map((row) => ({ ...row, saved: savedIds.has(row.id) })),
    total,
    page,
    pageCount,
  };
}

/**
 * Detail for one opportunity. Live items are visible to every member. The poster also sees their own
 * pending or rejected items. Everything else returns null.
 */
export async function getOpportunityForViewer(
  id: string,
  viewerId: string,
  now: Date = new Date(),
): Promise<OpportunityDetail | null> {
  const row = await db.opportunity.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      organization: true,
      category: true,
      remoteType: true,
      locationCity: true,
      description: true,
      applicationUrl: true,
      deadline: true,
      status: true,
      postedById: true,
      postedBy: { select: { name: true } },
      saves: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
    },
  });
  if (!row) {
    return null;
  }

  const lifecycle = {
    status: row.status,
    deadline: row.deadline,
    postedById: row.postedById,
  };
  if (!canViewOpportunity(lifecycle, viewerId, now)) {
    return null;
  }

  // The link is validated on submission. Validating again keeps an unsafe stored value out of the href.
  const url = parseApplicationUrl(row.applicationUrl);
  return {
    id: row.id,
    title: row.title,
    organization: row.organization,
    category: row.category,
    remoteType: row.remoteType,
    locationCity: row.locationCity,
    description: row.description,
    applicationUrl: url.ok ? url.url : null,
    deadline: row.deadline,
    status: row.status,
    isPoster: row.postedById === viewerId,
    isLive: isOpportunityLive(lifecycle, now),
    saved: row.saves.length > 0,
    postedByName: row.postedBy.name,
  };
}
