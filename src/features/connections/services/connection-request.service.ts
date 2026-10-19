import "server-only";

import { ROUTES } from "@/constants/routes";
import { recordAudit, type DbClient } from "@/features/audit/services/audit.service";
import { countCharacters } from "@/features/messages/domain/message-rules";
import { createNotification } from "@/features/notifications/services/notification.service";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { cleanText } from "@/lib/security/text";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import {
  CONNECTION_NOTE_MAX_LENGTH,
  decideRequestAction,
  evaluateSendRequest,
  isBlockedPair,
  type RequestAction,
  type SendRequestDenial,
} from "../domain/connection-rules";
import { createPairKey, orderPair } from "../domain/pair-key";

import { loadPairSnapshot } from "./connection.service";
import { isUniqueViolation } from "./db-errors";
import { loadActiveMemberIds } from "./member-status";
import { acquireTransactionLock, pairLockKey } from "./pair-lock";

const UNAVAILABLE_MESSAGE = "This request is no longer available.";
const DUPLICATE_MESSAGE = "This request was already sent. Refresh the page to see its status.";
const GENERIC_FAILURE = "We could not update this connection right now. Please try again shortly.";
const NOTE_TOO_LONG_MESSAGE = `Keep the note to ${CONNECTION_NOTE_MAX_LENGTH} characters or fewer.`;

const SEND_DENIAL_MESSAGES: Record<SendRequestDenial, string> = {
  SELF: "You cannot send a connection request to yourself.",
  INACTIVE: "This member cannot receive connection requests right now.",
  BLOCKED: "This connection request cannot be sent.",
  ALREADY_CONNECTED: "You are already connected with this member.",
  ALREADY_SENT: "Your request is already waiting for a response.",
  RECEIVED_FROM_OTHER: "This member has already sent you a request. Respond to it on your connections page.",
};

const RESPONSE_AUDIT_ACTIONS: Record<RequestAction, string> = {
  ACCEPT: "connection.accepted",
  DECLINE: "connection.declined",
  WITHDRAW: "connection.withdrawn",
};

export interface SendConnectionRequestParams {
  requesterId: string;
  addresseeId: string;
  note?: string;
}

/**
 * Creates a pending request, or reopens the pair's declined or withdrawn row. Runs under the pair lock so a
 * concurrent block or duplicate send is decided against the same state.
 */
export async function sendConnectionRequest(
  params: SendConnectionRequestParams,
): Promise<ActionResult<{ requestId: string }>> {
  const { requesterId, addresseeId } = params;
  if (requesterId === addresseeId) {
    return actionError(SEND_DENIAL_MESSAGES.SELF);
  }

  const cleanedNote = cleanText(params.note ?? "");
  if (countCharacters(cleanedNote) > CONNECTION_NOTE_MAX_LENGTH) {
    return actionError(NOTE_TOO_LONG_MESSAGE);
  }
  const note = cleanedNote.length > 0 ? cleanedNote : null;

  const pairKey = createPairKey(requesterId, addresseeId);
  try {
    return await db.$transaction(async (tx): Promise<ActionResult<{ requestId: string }>> => {
      await acquireTransactionLock(tx, pairLockKey(pairKey));

      const users = await tx.user.findMany({
        where: { id: { in: [requesterId, addresseeId] } },
        select: { id: true, name: true },
      });
      const requesterName = users.find((user) => user.id === requesterId)?.name ?? "A member";
      const addresseeExists = users.some((user) => user.id === addresseeId);
      const activeIds = await loadActiveMemberIds(tx, [requesterId, addresseeId]);
      const pair = await loadPairSnapshot(tx, requesterId, addresseeId);

      const decision = evaluateSendRequest({
        requesterId,
        addresseeId,
        requesterActive: activeIds.has(requesterId),
        addresseeActive: addresseeExists && activeIds.has(addresseeId),
        pair,
      });
      if (!decision.ok) {
        return actionError(SEND_DENIAL_MESSAGES[decision.reason]);
      }

      let requestId: string;
      if (decision.write === "CREATE") {
        const created = await tx.connectionRequest.create({
          data: { requesterId, addresseeId, pairKey, status: "PENDING", message: note },
          select: { id: true },
        });
        requestId = created.id;
      } else {
        const previous = pair.request;
        if (!previous) {
          return actionError(UNAVAILABLE_MESSAGE);
        }
        const reopened = await tx.connectionRequest.updateMany({
          where: { id: previous.id, status: previous.status },
          data: {
            requesterId,
            addresseeId,
            status: "PENDING",
            message: note,
            respondedAt: null,
            createdAt: new Date(),
          },
        });
        if (reopened.count !== 1) {
          return actionError(UNAVAILABLE_MESSAGE);
        }
        requestId = previous.id;
      }

      await createNotification(tx, {
        userId: addresseeId,
        kind: "CONNECTION",
        title: "New connection request",
        body: `${requesterName} sent you a connection request.`,
        linkPath: ROUTES.appConnections,
      });
      await recordAudit(tx, {
        action: "connection.requested",
        entityType: "connection_request",
        entityId: requestId,
        actorId: requesterId,
      });
      return actionOk({ requestId });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionError(DUPLICATE_MESSAGE);
    }
    log("error", "connection.request_failed", { requesterId, addresseeId, error });
    return actionError(GENERIC_FAILURE);
  }
}

/** Accepting requires both members to be active and no block between them. Checked under the pair lock. */
async function canAcceptBetween(client: DbClient, actorId: string, requesterId: string): Promise<boolean> {
  const pair = await loadPairSnapshot(client, actorId, requesterId);
  if (isBlockedPair(pair) || pair.connected) {
    return false;
  }
  const activeIds = await loadActiveMemberIds(client, [actorId, requesterId]);
  return activeIds.has(actorId) && activeIds.has(requesterId);
}

async function respondToRequest(actorId: string, otherId: string, action: RequestAction): Promise<ActionResult> {
  if (actorId === otherId) {
    return actionError(UNAVAILABLE_MESSAGE);
  }
  const pairKey = createPairKey(actorId, otherId);
  try {
    return await db.$transaction(async (tx): Promise<ActionResult> => {
      await acquireTransactionLock(tx, pairLockKey(pairKey));

      // Read after locking so the status reflects any block, withdrawal or response committed while waiting.
      const request = await tx.connectionRequest.findUnique({
        where: { pairKey },
        select: { id: true, pairKey: true, requesterId: true, addresseeId: true, status: true },
      });
      if (!request) {
        return actionError(UNAVAILABLE_MESSAGE);
      }

      const decision = decideRequestAction(action, actorId, request);
      if (!decision.ok) {
        return actionError(UNAVAILABLE_MESSAGE);
      }
      if (action === "ACCEPT" && !(await canAcceptBetween(tx, actorId, request.requesterId))) {
        return actionError(UNAVAILABLE_MESSAGE);
      }

      const changed = await tx.connectionRequest.updateMany({
        where: { id: request.id, status: request.status },
        data: { status: decision.nextStatus, respondedAt: new Date() },
      });
      if (changed.count !== 1) {
        return actionError(UNAVAILABLE_MESSAGE);
      }

      if (action === "ACCEPT") {
        const { low, high } = orderPair(request.requesterId, request.addresseeId);
        await tx.connection.create({
          data: { lowUserId: low, highUserId: high, pairKey: request.pairKey },
        });
        const accepter = await tx.user.findUnique({ where: { id: actorId }, select: { name: true } });
        await createNotification(tx, {
          userId: request.requesterId,
          kind: "CONNECTION",
          title: "Connection request accepted",
          body: `${accepter?.name ?? "A member"} accepted your connection request.`,
          linkPath: ROUTES.appConnections,
        });
      }

      await recordAudit(tx, {
        action: RESPONSE_AUDIT_ACTIONS[action],
        entityType: "connection_request",
        entityId: request.id,
        actorId,
      });
      return actionOk();
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return actionError(UNAVAILABLE_MESSAGE);
    }
    log("error", "connection.response_failed", { actorId, otherId, action, error });
    return actionError(GENERIC_FAILURE);
  }
}

/** Addressee only. Creates the Connection row in the same transaction as the status change. */
export async function acceptConnectionRequest(actorId: string, otherId: string): Promise<ActionResult> {
  return respondToRequest(actorId, otherId, "ACCEPT");
}

/** Addressee only. Silent to the requester by design. */
export async function declineConnectionRequest(actorId: string, otherId: string): Promise<ActionResult> {
  return respondToRequest(actorId, otherId, "DECLINE");
}

/** Requester only. */
export async function withdrawConnectionRequest(actorId: string, otherId: string): Promise<ActionResult> {
  return respondToRequest(actorId, otherId, "WITHDRAW");
}

/**
 * Removes an accepted connection for either member. Deletes the Connection row and the pair's request row,
 * so a new request can start from a clean state.
 */
export async function removeConnection(actorId: string, otherId: string): Promise<ActionResult> {
  if (actorId === otherId) {
    return actionError(UNAVAILABLE_MESSAGE);
  }
  const pairKey = createPairKey(actorId, otherId);
  try {
    return await db.$transaction(async (tx): Promise<ActionResult> => {
      await acquireTransactionLock(tx, pairLockKey(pairKey));

      const connection = await tx.connection.findUnique({ where: { pairKey }, select: { id: true } });
      if (!connection) {
        return actionError(UNAVAILABLE_MESSAGE);
      }
      await tx.connection.delete({ where: { id: connection.id } });
      await tx.connectionRequest.deleteMany({ where: { pairKey } });
      await recordAudit(tx, {
        action: "connection.removed",
        entityType: "connection",
        entityId: connection.id,
        actorId,
      });
      return actionOk();
    });
  } catch (error) {
    log("error", "connection.remove_failed", { actorId, otherId, error });
    return actionError(GENERIC_FAILURE);
  }
}
