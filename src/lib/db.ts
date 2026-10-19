import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

const globalForDb = globalThis as unknown as { prismaClient?: PrismaClient };

/**
 * Shared Prisma client. Reused across hot reloads in development so that
 * connection pools do not multiply. Import only from server code.
 */
export const db: PrismaClient =
  globalForDb.prismaClient ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: getEnv().DATABASE_URL }),
  });

if (getEnv().NODE_ENV !== "production") {
  globalForDb.prismaClient = db;
}
