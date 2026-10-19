"use server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleanText } from "@/lib/security/text";
import { requireActiveMember, requireUser } from "@/lib/session";
import { recordAudit } from "@/features/audit/services/audit.service";
import { markAllNotificationsRead } from "@/features/notifications/services/notification.service";
import { actionError, actionOk, type ActionResult } from "@/types/action";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";

const batchChangeSchema = z.object({
  requestedYear: z.coerce.number().int().min(1950).max(2200),
  reason: z.string().trim().min(20, "Explain the correction (at least 20 characters).").max(600),
});

/**
 * Identity-sensitive edits (batch and school years) from active members are never applied directly. They are
 * queued for administrator review, and the current batch stays in effect until the review is complete.
 */
export async function requestBatchChangeAction(values: unknown): Promise<ActionResult> {
  const user = await requireActiveMember();
  const parsed = batchChangeSchema.safeParse(values);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Check the batch correction details.");
  }

  const pending = await db.batchChangeRequest.count({ where: { userId: user.id, status: "PENDING" } });
  if (pending > 0) {
    return actionError("You already have a batch correction waiting for review.");
  }

  await db.$transaction(async (tx) => {
    const request = await tx.batchChangeRequest.create({
      data: {
        userId: user.id,
        requestedYear: parsed.data.requestedYear,
        reason: cleanText(parsed.data.reason),
        batchId: null,
      },
      select: { id: true },
    });
    await recordAudit(tx, {
      action: "batch_change.requested",
      entityType: "batch_change_request",
      entityId: request.id,
      actorId: user.id,
      metadata: { requestedYear: parsed.data.requestedYear },
    });
  });
  return actionOk();
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  return actionOk();
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password.").max(128),
    newPassword: z.string().min(12, "Use at least 12 characters.").max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The new passwords do not match.",
  });

/** Changes the password through Better Auth and signs out other sessions, so an old device loses access. */
export async function changePasswordAction(values: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = passwordSchema.safeParse(values);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Check the password fields.");
  }
  try {
    await auth.api.changePassword({
      body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
    return actionOk();
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 400) {
      return actionError("Your current password is not correct.");
    }
    return actionError("The password could not be changed. Try again shortly.");
  }
}

const accountRequestSchema = z.object({ kind: z.enum(["DATA_EXPORT", "CLOSURE"]) });

/**
 * Closure is a request, not an immediate deletion: finance records must be kept under the retention policy, so
 * an administrator completes the closure. Export is available straight away from the settings page.
 */
export async function requestAccountClosureAction(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = accountRequestSchema.safeParse(values);
  if (!parsed.success || parsed.data.kind !== "CLOSURE") {
    return actionError("Choose a valid request.");
  }
  const open = await db.accountRequest.count({ where: { userId: user.id, kind: "CLOSURE", status: "REQUESTED" } });
  if (open > 0) {
    return actionError("A closure request is already waiting for review.");
  }
  await db.accountRequest.create({ data: { userId: user.id, kind: "CLOSURE" } });
  return actionOk();
}
