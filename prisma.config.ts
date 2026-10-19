import { config as loadEnv } from "dotenv";

// Local development keeps secrets in .env.local; production sets real environment variables instead.
loadEnv({ path: ".env.local" });
loadEnv();
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` never connects, so CI and host install steps may run without DATABASE_URL.
    // The placeholder is only used when the variable is unset; migrations and the app need the real value.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
