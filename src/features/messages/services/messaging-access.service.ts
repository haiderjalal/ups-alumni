import "server-only";

import { isBlockedPair } from "@/features/connections/domain/connection-rules";
import type { DbClient } from "@/features/audit/services/audit.service";
import { loadPairSnapshot } from "@/features/connections/services/connection.service";
import { loadActiveMemberIds } from "@/features/connections/services/member-status";
import { actionError, actionOk, type ActionResult } from "@/types/action";

import { evaluateMessagingAccess, type MessagingDenial } from "../domain/messaging-access";

/** BLOCKED and NOT_CONNECTED share one message so a blocked member cannot tell that a block exists. */
export function messagingDenialMessage(denial: MessagingDenial): string {
  switch (denial) {
    case "VIEWER_INACTIVE":
      return "Messaging is available once your membership is active.";
    case "MEMBER_UNAVAILABLE":
      return "This member cannot receive messages right now.";
    case "BLOCKED":
    case "NOT_CONNECTED":
      return "You can only message members you are connected with.";
  }
}

/** Reads every fact that governs messaging between two members, then applies the pure rule. */
export async function getMessagingDenial(
  client: DbClient,
  viewerId: string,
  otherId: string,
): Promise<MessagingDenial | null> {
  const [pair, activeIds] = await Promise.all([
    loadPairSnapshot(client, viewerId, otherId),
    loadActiveMemberIds(client, [viewerId, otherId]),
  ]);
  return evaluateMessagingAccess({
    viewerActive: activeIds.has(viewerId),
    otherActive: activeIds.has(otherId),
    connected: pair.connected,
    blocked: isBlockedPair(pair),
  });
}

export async function assertMessagingAccess(
  client: DbClient,
  viewerId: string,
  otherId: string,
): Promise<ActionResult> {
  const denial = await getMessagingDenial(client, viewerId, otherId);
  return denial === null ? actionOk() : actionError(messagingDenialMessage(denial));
}
