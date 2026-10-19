import { randomBytes } from "node:crypto";
import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Integration tests run the real services against a separate PostgreSQL database (ups_alumni_test).
 * Secrets below are generated for each run and exist only in the test process; they are not persisted.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://ups_app:ups_local_only@localhost:5432/ups_alumni_test?schema=public",
      BETTER_AUTH_SECRET: randomBytes(32).toString("base64"),
      BETTER_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      EMAIL_DRIVER: "dev-sink",
      EMAIL_FROM: "UPS Alumni Network <test@example.com>",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: ".local-storage-test",
      APP_TIMEZONE: "Asia/Karachi",
    },
  },
});
