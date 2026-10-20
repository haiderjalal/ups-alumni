/**
 * Checks an environment file against the production rules, using the same validation as the build.
 * Prints the names of variables that are missing or invalid. It never prints values.
 *
 *   npx tsx scripts/check-env.ts .env.production.local
 */
import { config } from "dotenv";

async function main(): Promise<void> {
  const file = process.argv[2] ?? ".env.production.local";
  config({ path: file, override: true, quiet: true });
  (process.env as Record<string, string | undefined>).NODE_ENV = "production";

  const { getEnv } = await import("../src/lib/env");
  try {
    getEnv();
    console.info("OK: the production environment is valid.");
  } catch (error) {
    console.info(error instanceof Error ? error.message : "Environment check failed.");
    process.exitCode = 1;
  }
}

void main();
