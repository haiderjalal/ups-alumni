import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

const globalForDb = globalThis as unknown as { prismaClient?: PrismaClient };

let dbClient: PrismaClient | undefined;

/**
 * Creates the Prisma client on first use, so importing this module reads no configuration. Route modules can be
 * loaded at build time without a database URL, and a missing DATABASE_URL still fails on the first query.
 */
function getDbClient(): PrismaClient {
  if (dbClient) {
    return dbClient;
  }

  const { DATABASE_URL, NODE_ENV } = getEnv();
  dbClient =
    globalForDb.prismaClient ??
    new PrismaClient({
      adapter: new PrismaPg({ connectionString: DATABASE_URL }),
    });

  // Reused across hot reloads in development so connection pools do not multiply.
  if (NODE_ENV !== "production") {
    globalForDb.prismaClient = dbClient;
  }
  return dbClient;
}

/**
 * Shared Prisma client. Call sites keep the familiar `db.model.method()` form. Methods are bound to the real
 * client, so `$transaction` and other client methods keep their internal state. Import only from server code.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getDbClient();
    const value: unknown = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
