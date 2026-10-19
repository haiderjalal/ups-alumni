import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/** Better Auth endpoints: sign-up, sign-in, verification, password reset and sign-out. */
export const { GET, POST } = toNextJsHandler(auth);
