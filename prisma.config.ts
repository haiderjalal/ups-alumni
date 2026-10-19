import { config as loadEnv } from "dotenv";

// Local development keeps secrets in .env.local; production sets real environment variables instead.
loadEnv({ path: ".env.local" });
loadEnv();
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
