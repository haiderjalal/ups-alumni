import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Liveness and database connectivity. Returns no configuration or version details. */
export async function GET(): Promise<NextResponse> {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    log("error", "health.database_unreachable", { error });
    return NextResponse.json(
      { status: "degraded", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
