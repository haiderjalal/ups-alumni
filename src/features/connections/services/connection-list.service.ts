import "server-only";

import { db } from "@/lib/db";

import { listBlockRelatedUserIds } from "./connection.service";
import {
  buildMemberSummary,
  isActiveMemberRow,
  MEMBER_SUMMARY_SELECT,
  type MemberSummary,
  type MemberSummaryRow,
} from "./member-summary";

const REQUEST_LIST_LIMIT = 100;
const CONNECTION_LIST_LIMIT = 200;
const BLOCKED_LIST_LIMIT = 200;

export interface ConnectionRequestItem {
  id: string;
  message: string | null;
  createdAt: string;
  member: MemberSummary;
}

export interface ConnectionsPageData {
  incoming: ConnectionRequestItem[];
  outgoing: ConnectionRequestItem[];
  connections: MemberSummary[];
  blocked: MemberSummary[];
}

interface RequestRowFacts {
  id: string;
  message: string | null;
  createdAt: Date;
}

/** Drops requests whose other member is inactive or sits in a block with the viewer. */
function toRequestItem(
  row: RequestRowFacts,
  member: MemberSummaryRow,
  hiddenIds: ReadonlySet<string>,
): ConnectionRequestItem[] {
  if (!isActiveMemberRow(member) || hiddenIds.has(member.id)) {
    return [];
  }
  return [
    {
      id: row.id,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
      member: buildMemberSummary(member),
    },
  ];
}

/** Everything the connections page shows, scoped to the signed-in viewer. Callers verify an active membership. */
export async function getConnectionsPageData(viewerId: string): Promise<ConnectionsPageData> {
  const [incomingRows, outgoingRows, connectionRows, blockedRows, hiddenIds] = await Promise.all([
    db.connectionRequest.findMany({
      where: { addresseeId: viewerId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: REQUEST_LIST_LIMIT,
      select: {
        id: true,
        message: true,
        createdAt: true,
        requester: { select: MEMBER_SUMMARY_SELECT },
      },
    }),
    db.connectionRequest.findMany({
      where: { requesterId: viewerId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: REQUEST_LIST_LIMIT,
      select: {
        id: true,
        message: true,
        createdAt: true,
        addressee: { select: MEMBER_SUMMARY_SELECT },
      },
    }),
    db.connection.findMany({
      where: { OR: [{ lowUserId: viewerId }, { highUserId: viewerId }] },
      orderBy: { createdAt: "desc" },
      take: CONNECTION_LIST_LIMIT,
      select: {
        low: { select: MEMBER_SUMMARY_SELECT },
        high: { select: MEMBER_SUMMARY_SELECT },
      },
    }),
    db.block.findMany({
      where: { blockerId: viewerId },
      orderBy: { createdAt: "desc" },
      take: BLOCKED_LIST_LIMIT,
      select: { blocked: { select: MEMBER_SUMMARY_SELECT } },
    }),
    listBlockRelatedUserIds(viewerId),
  ]);

  return {
    incoming: incomingRows.flatMap((row) => toRequestItem(row, row.requester, hiddenIds)),
    outgoing: outgoingRows.flatMap((row) => toRequestItem(row, row.addressee, hiddenIds)),
    connections: connectionRows.flatMap((row) => {
      const member = row.low.id === viewerId ? row.high : row.low;
      if (!isActiveMemberRow(member) || hiddenIds.has(member.id)) {
        return [];
      }
      return [buildMemberSummary(member)];
    }),
    blocked: blockedRows.map((row) => buildMemberSummary(row.blocked)),
  };
}
