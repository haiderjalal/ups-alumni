// Test-only stand-in for the `server-only` guard. In Next.js the real package blocks client bundles;
// under Vitest the integration tests run server modules directly, so the guard is a no-op here.
export {};
