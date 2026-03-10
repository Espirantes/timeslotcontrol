/**
 * Vitest global setup — set required env vars directly on process.env so
 * env.ts validation passes in tests. Using process.env directly (not vi.stubEnv)
 * so vi.unstubAllEnvs() in individual test files does not clear them.
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
}
if (!process.env.AUTH_SECRET) {
  process.env.AUTH_SECRET = "test-secret-at-least-32-chars-long-xxx";
}
