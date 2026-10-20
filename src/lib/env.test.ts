import { afterEach, describe, expect, it, vi } from "vitest";

const VALID_DATABASE_URL = "postgresql://user:pw@db.example.com:6543/postgres";

function stubRequiredEnv(databaseUrl: string): void {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  vi.stubEnv("DATABASE_URL", databaseUrl);
  vi.stubEnv("BETTER_AUTH_URL", "https://example.com");
  vi.stubEnv("BETTER_AUTH_SECRET", "x".repeat(32));
  vi.stubEnv("EMAIL_FROM", "Team <no-reply@example.com>");
}

/** Loads a fresh copy of the module, because getEnv caches the first result it validates. */
async function freshGetEnv(): Promise<() => unknown> {
  vi.resetModules();
  return (await import("./env")).getEnv;
}

describe("DATABASE_URL validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a plain PostgreSQL URL", async () => {
    stubRequiredEnv(VALID_DATABASE_URL);
    const getEnv = await freshGetEnv();
    expect(() => getEnv()).not.toThrow();
  });

  it.each([
    ["wrapped in double quotes", `"${VALID_DATABASE_URL}"`],
    ["wrapped in single quotes", `'${VALID_DATABASE_URL}'`],
    ["with a leading space", ` ${VALID_DATABASE_URL}`],
    ["pasted together with the variable name", `DATABASE_URL=${VALID_DATABASE_URL}`],
  ])("rejects a value %s, which the driver would read as the host 'base'", async (_label, value) => {
    stubRequiredEnv(value);
    const getEnv = await freshGetEnv();
    expect(() => getEnv()).toThrow(/DATABASE_URL must start with postgresql:\/\//);
  });

  it("never echoes the rejected value, so a password cannot reach the logs", async () => {
    stubRequiredEnv('"postgresql://user:topsecret@db.example.com/postgres"');
    const getEnv = await freshGetEnv();
    expect(() => getEnv()).toThrow(/Invalid environment configuration/);
    expect(() => getEnv()).not.toThrow(/topsecret/);
  });
});
