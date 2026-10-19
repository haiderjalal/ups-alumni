import { NextResponse } from "next/server";

import { canReadMedia, readMediaBytes } from "@/features/media/services/media.service";
import { getCurrentUser, getMemberStatus, getStaffRoles } from "@/lib/session";

export const dynamic = "force-dynamic";

interface FileRouteProps {
  params: Promise<{ id: string }>;
}

/**
 * Streams a private file after an authorization check made on this request. Nothing is cached, and the
 * response cannot be embedded or sniffed as another type.
 */
export async function GET(_request: Request, { params }: FileRouteProps): Promise<NextResponse> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !/^[a-z0-9]{20,40}$/.test(id)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const [membership, staffRoles] = await Promise.all([getMemberStatus(user.id), getStaffRoles(user.id)]);
  const allowed = await canReadMedia(id, {
    userId: user.id,
    isActiveMember: membership?.membershipStatus === "ACTIVE",
    staffRoles,
  });
  if (!allowed) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const file = await readMediaBytes(id);
  if (!file) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const safeName = file.originalName.replace(/[^A-Za-z0-9._-]/g, "_");
  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Length": String(file.bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
