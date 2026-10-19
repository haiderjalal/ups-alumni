import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { MediaKind, StaffRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getStorage } from "@/lib/storage";

import { sanitizeFileName, validateUploadBytes, type UploadRejection } from "../domain/uploads";

export type StoreUploadResult =
  | { ok: true; mediaId: string; mimeType: string; sizeBytes: number }
  | { ok: false; reason: UploadRejection | "TOO_MANY_RECENT_UPLOADS" };

/** Uploads a member may make in one hour. Stops abuse of storage without affecting normal registration. */
const UPLOADS_PER_HOUR = 20;

/**
 * Validates and stores a private file, then records its metadata. Bytes go to private object storage under a
 * random key; the browser-supplied name is kept only for display.
 */
export async function storeUpload(input: {
  ownerId: string;
  kind: Extract<MediaKind, "RECEIPT" | "PROFILE_PHOTO">;
  originalName: string;
  bytes: Uint8Array;
}): Promise<StoreUploadResult> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentUploads = await db.mediaAsset.count({ where: { ownerId: input.ownerId, createdAt: { gte: hourAgo } } });
  if (recentUploads >= UPLOADS_PER_HOUR) {
    return { ok: false, reason: "TOO_MANY_RECENT_UPLOADS" };
  }

  const validation = validateUploadBytes(input.bytes);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  const storageKey = `${input.kind.toLowerCase()}/${randomBytes(18).toString("base64url")}`;
  await getStorage().put({
    key: storageKey,
    body: input.bytes,
    contentType: validation.detected.mimeType,
  });

  const asset = await db.mediaAsset.create({
    data: {
      ownerId: input.ownerId,
      kind: input.kind,
      visibility: "PRIVATE",
      storageKey,
      mimeType: validation.detected.mimeType,
      sizeBytes: input.bytes.length,
      originalName: `${sanitizeFileName(input.originalName)}.${validation.detected.extension}`.slice(0, 160),
      sha256: createHash("sha256").update(input.bytes).digest("hex"),
    },
    select: { id: true, mimeType: true, sizeBytes: true },
  });

  return { ok: true, mediaId: asset.id, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes };
}

export interface MediaReadViewer {
  userId: string;
  isActiveMember: boolean;
  staffRoles: readonly StaffRole[];
}

/**
 * Who may read a stored file. Owners always may. Receipts are limited to finance reviewers. Profile photos
 * are shown to active members only when the profile is discoverable. Everything else is denied.
 */
export async function canReadMedia(mediaId: string, viewer: MediaReadViewer): Promise<boolean> {
  const media = await db.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { ownerId: true, kind: true, deletedAt: true },
  });
  if (!media || media.deletedAt) {
    return false;
  }
  if (media.ownerId === viewer.userId) {
    return true;
  }
  if (media.kind === "RECEIPT") {
    return viewer.staffRoles.includes("FINANCE_REVIEWER") || viewer.staffRoles.includes("SUPER_ADMIN");
  }
  if (media.kind === "PROFILE_PHOTO") {
    if (viewer.staffRoles.includes("MEMBERSHIP_ADMIN") || viewer.staffRoles.includes("SUPER_ADMIN")) {
      return true;
    }
    if (!viewer.isActiveMember) {
      return false;
    }
    const profile = await db.alumniProfile.findFirst({
      where: { photoMediaId: mediaId },
      select: { directoryDiscoverable: true },
    });
    return Boolean(profile?.directoryDiscoverable);
  }
  return false;
}

export interface ReadableMedia {
  bytes: Uint8Array;
  mimeType: string;
  originalName: string;
}

export async function readMediaBytes(mediaId: string): Promise<ReadableMedia | null> {
  const media = await db.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { storageKey: true, mimeType: true, originalName: true },
  });
  if (!media) {
    return null;
  }
  const bytes = await getStorage().get(media.storageKey);
  if (!bytes) {
    return null;
  }
  // The MIME type was verified from the file's bytes at upload time, so the stored value is served as-is.
  return { bytes, mimeType: media.mimeType, originalName: media.originalName };
}
