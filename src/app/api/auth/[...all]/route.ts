import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

/*
 * Better Auth endpoints: sign-up, sign-in, verification, password reset and sign-out. Handlers are built per request,
 * so loading this route during the build does not read configuration or touch the database.
 */
export async function GET(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).POST(request);
}
