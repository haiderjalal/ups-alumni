import "server-only";

import type { Prisma, StaffRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Client accepted by service functions. The shared client and transaction clients both satisfy it,
 * so one function can run standalone or inside a transaction.
 */
export type DbClient = Prisma.TransactionClient;

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorRoles?: readonly StaffRole[];
  /** Identifiers and decision details only. Never include documents, message bodies or secrets. */
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Appends one audit record. Call inside the same transaction as the change it records, so a change
 * cannot commit without its audit trail.
 */
export async function recordAudit(client: DbClient, entry: AuditEntry): Promise<void> {
  await client.auditLog.create({
    data: {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: entry.actorId ?? null,
      actorRoles: entry.actorRoles ? [...entry.actorRoles] : [],
      metadataJson: entry.metadata ?? undefined,
    },
  });
}

/** Read-only audit history for administrators. Callers must already have verified the staff role. */
export async function listAuditEntries(limit: number): Promise<
  Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    actorId: string | null;
    createdAt: Date;
  }>
> {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
    select: { id: true, action: true, entityType: true, entityId: true, actorId: true, createdAt: true },
  });
}
