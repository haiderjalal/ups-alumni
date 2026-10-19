import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { isBlockedBetween } from "@/features/connections/services/connection.service";
import { db } from "@/lib/db";
import { toSafeHttpUrl } from "@/lib/security/text";

import {
  canSendCollaborationRequest,
  collaborationAvailableAt,
  getPublicContact,
  type BusinessStatus,
  type PublicContact,
} from "../domain/business-rules";

export const BUSINESS_PAGE_SIZE = 12;

export interface BusinessDirectoryFilters {
  sector: string | null;
  city: string | null;
  page: number;
}

export interface BusinessCard {
  slug: string;
  name: string;
  sector: string;
  city: string;
  description: string;
}

export interface BusinessDirectoryPage {
  items: BusinessCard[];
  total: number;
  page: number;
  pageCount: number;
}

export type CollaborationAvailability =
  | { state: "owner" }
  | { state: "unavailable" }
  | { state: "cooldown"; availableAt: Date }
  | { state: "available" };

export interface BusinessDetail {
  id: string;
  slug: string;
  name: string;
  sector: string;
  city: string;
  description: string;
  productsServices: string;
  websiteUrl: string | null;
  status: BusinessStatus;
  isOwner: boolean;
  contact: PublicContact | null;
  collaboration: CollaborationAvailability;
}

/** Published listings only, optionally narrowed by sector and city. */
export async function listPublishedBusinesses(
  filters: BusinessDirectoryFilters,
): Promise<BusinessDirectoryPage> {
  const where: Prisma.BusinessWhereInput = {
    status: "PUBLISHED",
    ...(filters.sector ? { sector: filters.sector } : {}),
    ...(filters.city ? { city: filters.city } : {}),
  };

  const total = await db.business.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / BUSINESS_PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);

  const items = await db.business.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: (page - 1) * BUSINESS_PAGE_SIZE,
    take: BUSINESS_PAGE_SIZE,
    select: {
      slug: true,
      name: true,
      sector: true,
      city: true,
      description: true,
    },
  });

  return { items, total, page, pageCount };
}

/** Sector and city values that currently appear on published listings, for filter menus. */
export async function listDirectoryFacets(): Promise<{
  sectors: string[];
  cities: string[];
}> {
  const [sectorRows, cityRows] = await Promise.all([
    db.business.findMany({
      where: { status: "PUBLISHED" },
      distinct: ["sector"],
      orderBy: { sector: "asc" },
      select: { sector: true },
      take: 100,
    }),
    db.business.findMany({
      where: { status: "PUBLISHED" },
      distinct: ["city"],
      orderBy: { city: "asc" },
      select: { city: true },
      take: 100,
    }),
  ]);
  return {
    sectors: sectorRows.map((row) => row.sector),
    cities: cityRows.map((row) => row.city),
  };
}

/**
 * Detail view for one listing. Owners may preview a listing in any status. Other members see only
 * published listings. Returns null when the viewer must not know the listing exists.
 */
export async function getBusinessDetailForViewer(
  slug: string,
  viewerId: string,
  now: Date = new Date(),
): Promise<BusinessDetail | null> {
  const business = await db.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      sector: true,
      city: true,
      description: true,
      productsServices: true,
      websiteUrl: true,
      status: true,
      publishContact: true,
      contactEmail: true,
      contactPhone: true,
      owners: { select: { userId: true } },
    },
  });
  if (!business) {
    return null;
  }

  const ownerIds = business.owners.map((owner) => owner.userId);
  const isOwner = ownerIds.includes(viewerId);
  if (business.status !== "PUBLISHED" && !isOwner) {
    return null;
  }

  const collaboration = await resolveCollaboration({
    businessId: business.id,
    viewerId,
    isOwner,
    isPublished: business.status === "PUBLISHED",
    ownerIds,
    now,
  });

  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    sector: business.sector,
    city: business.city,
    description: business.description,
    productsServices: business.productsServices,
    websiteUrl: business.websiteUrl ? toSafeHttpUrl(business.websiteUrl) : null,
    status: business.status,
    isOwner,
    contact: getPublicContact(business),
    collaboration,
  };
}

interface CollaborationInput {
  businessId: string;
  viewerId: string;
  isOwner: boolean;
  isPublished: boolean;
  ownerIds: string[];
  now: Date;
}

async function resolveCollaboration(
  input: CollaborationInput,
): Promise<CollaborationAvailability> {
  if (input.isOwner) {
    return { state: "owner" };
  }
  if (!input.isPublished) {
    return { state: "unavailable" };
  }

  // A block in either direction with any owner stops contact. The reason is not revealed.
  const blocked = await Promise.all(
    input.ownerIds.map((ownerId) => isBlockedBetween(input.viewerId, ownerId)),
  );
  if (blocked.some(Boolean)) {
    return { state: "unavailable" };
  }

  const last = await db.collaborationRequest.findFirst({
    where: { businessId: input.businessId, requesterId: input.viewerId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!last || canSendCollaborationRequest(last.createdAt, input.now)) {
    return { state: "available" };
  }
  return {
    state: "cooldown",
    availableAt: collaborationAvailableAt(last.createdAt),
  };
}
