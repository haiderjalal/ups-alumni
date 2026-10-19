import "server-only";

import { randomBytes } from "node:crypto";

import type { DbClient } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";

import { BusinessError } from "../domain/business-errors";
import {
  buildBusinessSlug,
  canEditBusiness,
  canSubmitBusiness,
  hasBusinessContentChanged,
  statusAfterEdit,
  type BusinessContent,
  type BusinessStatus,
} from "../domain/business-rules";
import {
  parseOrThrow,
  parseOwnedBusiness,
  submitBusinessSchema,
  type OwnedBusinessInput,
  type SubmitBusinessInput,
} from "../validation/business.schema";

export interface OwnedBusinessView extends BusinessContent {
  id: string;
  slug: string;
  status: BusinessStatus;
  publishContact: boolean;
  updatedAt: Date;
}

const OWNED_BUSINESS_SELECT = {
  id: true,
  slug: true,
  status: true,
  publishContact: true,
  name: true,
  sector: true,
  city: true,
  description: true,
  productsServices: true,
  websiteUrl: true,
  contactEmail: true,
  contactPhone: true,
  updatedAt: true,
} as const;

/**
 * Creates or updates the signed-in owner's primary business. New listings start as DRAFT. Calling this
 * again with the same content changes nothing, so retries and autosaves are safe. The owner row lock
 * stops two concurrent first saves from creating two listings.
 */
export async function saveOwnedBusiness(
  userId: string,
  input: OwnedBusinessInput,
): Promise<{ businessId: string }> {
  const content = parseOwnedBusiness(input);

  return db.$transaction(async (tx) => {
    await lockUserRow(tx, userId);

    const owned = await tx.businessOwner.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { business: { select: OWNED_BUSINESS_SELECT } },
    });

    if (!owned) {
      return createBusiness(tx, userId, content);
    }
    return updateBusiness(tx, owned.business, content);
  });
}

/**
 * Sends a listing to staff review and records the contact opt-in given at submission. Only the owner
 * can submit. A published listing is resubmitted only to change its contact opt-in.
 */
export async function submitBusinessForReview(
  userId: string,
  input: unknown,
): Promise<void> {
  const data: SubmitBusinessInput = parseOrThrow(submitBusinessSchema, input);

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${data.businessId} FOR UPDATE`;

    const ownership = await tx.businessOwner.findUnique({
      where: { businessId_userId: { businessId: data.businessId, userId } },
      select: { businessId: true },
    });
    if (!ownership) {
      throw new BusinessError("This business could not be found.");
    }

    const business = await tx.business.findUnique({
      where: { id: data.businessId },
      select: { status: true, publishContact: true },
    });
    if (!business) {
      throw new BusinessError("This business could not be found.");
    }

    const allowed = canSubmitBusiness({
      status: business.status,
      currentPublishContact: business.publishContact,
      nextPublishContact: data.publishContact,
    });
    if (!allowed) {
      throw new BusinessError(
        "This listing is already in review or already live with these settings.",
      );
    }

    const result = await tx.business.updateMany({
      where: { id: data.businessId, status: business.status },
      data: { status: "PENDING_REVIEW", publishContact: data.publishContact },
    });
    if (result.count !== 1) {
      throw new BusinessError(
        "This listing changed while you were submitting. Reload and try again.",
      );
    }
  });
}

/** The owner's primary (oldest) business, or null when the member has not created one yet. */
export async function getPrimaryOwnedBusiness(
  userId: string,
): Promise<OwnedBusinessView | null> {
  const owned = await db.businessOwner.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { business: { select: OWNED_BUSINESS_SELECT } },
  });
  return owned ? owned.business : null;
}

async function lockUserRow(tx: DbClient, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
}

async function createBusiness(
  tx: DbClient,
  userId: string,
  content: BusinessContent,
): Promise<{ businessId: string }> {
  const business = await tx.business.create({
    data: {
      ...content,
      slug: buildBusinessSlug(content.name, randomBytes(4).toString("hex")),
      status: "DRAFT",
      publishContact: false,
      owners: { create: { userId } },
    },
    select: { id: true },
  });
  return { businessId: business.id };
}

async function updateBusiness(
  tx: DbClient,
  current: OwnedBusinessView,
  content: BusinessContent,
): Promise<{ businessId: string }> {
  if (!hasBusinessContentChanged(current, content)) {
    return { businessId: current.id };
  }

  if (!canEditBusiness(current.status)) {
    throw new BusinessError(
      current.status === "PENDING_REVIEW"
        ? "Your listing is awaiting staff review, so it cannot be edited until a decision is made."
        : "This listing can no longer be edited.",
    );
  }

  const result = await tx.business.updateMany({
    where: { id: current.id, status: current.status },
    data: { ...content, status: statusAfterEdit(current.status, true) },
  });
  if (result.count !== 1) {
    throw new BusinessError(
      "This listing changed while you were saving. Reload and try again.",
    );
  }
  return { businessId: current.id };
}
