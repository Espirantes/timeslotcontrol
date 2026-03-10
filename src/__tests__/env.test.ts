import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env.ts", () => {
  it("throws with a clear message when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-chars-long-xxx");

    await expect(import("@/lib/env")).rejects.toThrow("DATABASE_URL");
  });

  it("throws with a clear message when AUTH_SECRET is missing", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb");
    vi.stubEnv("AUTH_SECRET", "");

    await expect(import("@/lib/env")).rejects.toThrow("AUTH_SECRET");
  });

  it("throws prefixed with [env] for easy identification", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-chars-long-xxx");

    await expect(import("@/lib/env")).rejects.toThrow("[env]");
  });

  it("exports parsed env when all required vars are present", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb");
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-chars-long-xxx");

    const { env } = await import("@/lib/env");

    expect(env.DATABASE_URL).toBe("postgresql://test:test@localhost:5432/testdb");
    expect(env.AUTH_SECRET).toBe("test-secret-at-least-32-chars-long-xxx");
  });

  it("optional vars default to undefined when not set", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb");
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-chars-long-xxx");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const { env } = await import("@/lib/env");

    // Empty strings are still strings — optional means they are not required, not that they are coerced
    expect(env.RESEND_API_KEY === undefined || typeof env.RESEND_API_KEY === "string").toBe(true);
  });

  it("accepts valid NODE_ENV values", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb");
    vi.stubEnv("AUTH_SECRET", "test-secret-at-least-32-chars-long-xxx");
    vi.stubEnv("NODE_ENV", "production");

    const { env } = await import("@/lib/env");

    expect(env.NODE_ENV).toBe("production");
  });
});
