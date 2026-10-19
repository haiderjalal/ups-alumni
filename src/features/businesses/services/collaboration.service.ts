import "server-only";

import { ROUTES } from "@/constants/routes";
import { createNotification } from "@/features/notifications/services/notification.service";
import { isBlockedBetween } from "@/features/connections/services/connection.service";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/time";

import { BusinessError } from "../domain/business-errors";
import {
  canSendCollaborationRequest,
  collaborationAvailableAt,
} from "../domain/business-rules";
import { parseCollaborationRequest } from "../validation/business.schema";

export interface CollaborationRequestView {
  id: string;
  message: string;
  createdAt: Date;
  requesterName: string;
}

const GENERIC_UNAVAILABLE =
  "This business cannot receive messages from your account.";

/**
 * Sends one collaboration message to a published business. A member may send one message per business
 * every seven days. The business row lock serializes concurrent sends so the cooldown cannot be bypassed.
 * Owners are notified without the message text, which they read on the manage page.
 */
export async function sendCollaborationRequest(
  requesterId: string,
  input: unknown,
  now: Date = new Date(),
): Promise<{ requestId: string }> {
  const data = parseCollaborationRequest(input);

  const business = await db.business.findUnique({
    where: { id: data.businessId },
    select: {
      id: true,
      name: true,
      status: true,
      owners: { select: { userId: true } },
    },
  });
  if (!business || business.status !== "PUBLISHED") {
    throw new BusinessError(
      "This business is not accepting messages right now.",
    );
  }

  const ownerIds = business.owners.map((owner) => owner.userId);
  if (ownerIds.includes(requesterId)) {
    throw new BusinessError(
      "You manage this business, so you cannot message it.",
    );
  }

  const blocked = await Promise.all(
    ownerIds.map((ownerId) => isBlockedBetween(requesterId, ownerId)),
  );
  if (blocked.some(Boolean)) {
    throw new BusinessError(GENERIC_UNAVAILABLE);
  }

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${business.id} FOR UPDATE`;

    const last = await tx.collaborationRequest.findFirst({
      where: { businessId: business.id, requesterId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (last && !canSendCollaborationRequest(last.createdAt, now)) {
      const availableOn = formatDate(collaborationAvailableAt(last.createdAt));
      throw new BusinessError(
        `You can send another message to this business on ${availableOn}.`,
      );
    }

    const request = await tx.collaborationRequest.create({
      data: { businessId: business.id, requesterId, message: data.message },
      select: { id: true },
    });

    for (const ownerId of ownerIds) {
      await createNotification(tx, {
        userId: ownerId,
        kind: "SYSTEM",
        title: "New message about your business",
        body: `A member sent a message about ${business.name}. Open Manage listing to read it.`,
        linkPath: `${ROUTES.appBusinesses}/manage`,
      });
    }

    return { requestId: request.id };
  });
}

/** Messages received for a business. Returns an empty list when the viewer is not an owner. */
export async function listCollaborationRequestsForOwner(
  ownerId: string,
  businessId: string,
): Promise<CollaborationRequestView[]> {
  const ownership = await db.businessOwner.findUnique({
    where: { businessId_userId: { businessId, userId: ownerId } },
    select: { businessId: true },
  });
  if (!ownership) {
    return [];
  }

  const rows = await db.collaborationRequest.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      message: true,
      createdAt: true,
      requester: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    createdAt: row.createdAt,
    requesterName: row.requester.name,
  }));
}
