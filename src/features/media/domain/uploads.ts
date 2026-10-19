/**
 * Upload policy. Files are checked by their leading bytes, never by the browser-supplied type or extension.
 * Executable and markup formats (HTML, SVG, scripts) are not accepted at all.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type AcceptedMimeType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export interface DetectedUpload {
  mimeType: AcceptedMimeType;
  extension: "jpg" | "png" | "webp" | "pdf";
}

/** Identifies a file from its signature bytes. Returns null for anything outside the allow list. */
export function detectUploadType(bytes: Uint8Array): DetectedUpload | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && pngSignature.every((value, index) => bytes[index] === value)) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") {
    return { mimeType: "application/pdf", extension: "pdf" };
  }
  return null;
}

export type UploadRejection = "EMPTY" | "TOO_LARGE" | "UNSUPPORTED_TYPE";

export function validateUploadBytes(bytes: Uint8Array): { ok: true; detected: DetectedUpload } | { ok: false; reason: UploadRejection } {
  if (bytes.length === 0) {
    return { ok: false, reason: "EMPTY" };
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "TOO_LARGE" };
  }
  const detected = detectUploadType(bytes);
  if (!detected) {
    return { ok: false, reason: "UNSUPPORTED_TYPE" };
  }
  return { ok: true, detected };
}

export const UPLOAD_REJECTION_MESSAGES: Record<UploadRejection, string> = {
  EMPTY: "The file is empty. Choose a different file.",
  TOO_LARGE: "The file is larger than 5 MB. Upload a smaller file.",
  UNSUPPORTED_TYPE: "This file type is not accepted. Upload a JPG, PNG, WebP image or a PDF.",
};

/**
 * Reduces a browser file name to letters, digits, dots, dashes and underscores. The result is only stored
 * for display and is never used as a storage path.
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "upload";
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "");
  return cleaned.slice(0, 120) || "upload";
}
