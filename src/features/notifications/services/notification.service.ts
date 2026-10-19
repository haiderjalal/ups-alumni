import "server-only";

import type { DbClient } from "@/features/audit/services/audit.service";
import { db } from "@/lib/db";
import type { NotificationKind } from "@/generated/prisma/client";

export interface NotificationInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Internal path only (must start with "/"). Never an external URL. */
  linkPath?: string;
}

/** Writes an in-app notification. Pass the transaction client when the notice must commit with the change. */
export async function createNotification(client: DbClient, input: NotificationInput): Promise<void> {
  if (input.linkPath !== undefined && (!input.linkPath.startsWith("/") || input.linkPath.startsWith("//"))) {
    throw new Error("Notification links must be internal paths.");
  }
  await client.notification.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      linkPath: input.linkPath ?? null,
    },
  });
}

/** Most recent notifications for one member. Callers must pass the signed-in user id, never a request parameter. */
export async function listNotifications(userId: string, limit: number) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: { id: true, kind: true, title: true, body: true, linkPath: true, readAt: true, createdAt: true },
  });
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
