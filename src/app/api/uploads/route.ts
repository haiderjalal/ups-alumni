import { NextResponse } from "next/server";
import { z } from "zod";

import { MAX_UPLOAD_BYTES, UPLOAD_REJECTION_MESSAGES } from "@/features/media/domain/uploads";
import { storeUpload } from "@/features/media/services/media.service";
import { getCurrentUser } from "@/lib/session";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

const kindSchema = z.enum(["RECEIPT", "PROFILE_PHOTO"]);

/**
 * Accepts one private file for a signed-in member. Signed-in is enough: pending members upload receipts and
 * photos too. Size is checked before the body is read, and type is checked from the bytes.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to upload files." }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ ok: false, message: UPLOAD_REJECTION_MESSAGES.TOO_LARGE }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "The upload could not be read. Try again." }, { status: 400 });
  }

  const kind = kindSchema.safeParse(form.get("kind"));
  const file = form.get("file");
  if (!kind.success || !(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, message: UPLOAD_REJECTION_MESSAGES.TOO_LARGE }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await storeUpload({
      ownerId: user.id,
      kind: kind.data,
      originalName: file.name,
      bytes,
    });
    if (!result.ok) {
      const message =
        result.reason === "TOO_MANY_RECENT_UPLOADS"
          ? "You have reached the upload limit for this hour. Try again later."
          : UPLOAD_REJECTION_MESSAGES[result.reason];
      return NextResponse.json({ ok: false, message }, { status: 422 });
    }
    return NextResponse.json({ ok: true, data: { mediaId: result.mediaId } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    log("error", "upload.failed", { userId: user.id, error });
    return NextResponse.json({ ok: false, message: "The file could not be saved. Try again shortly." }, { status: 500 });
  }
}
