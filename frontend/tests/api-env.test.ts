import { afterEach, describe, expect, it, vi } from "vitest";

describe("API environment configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the central timeout defaults", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "");
    vi.stubEnv("NEXT_PUBLIC_API_EXPORT_TIMEOUT_MS", "");

    const config = await import("@/lib/config/env");

    expect(config.DEFAULT_API_TIMEOUT_MS).toBe(60_000);
    expect(config.DEFAULT_API_EXPORT_TIMEOUT_MS).toBe(120_000);
    expect(config.apiTimeoutMs).toBe(config.DEFAULT_API_TIMEOUT_MS);
    expect(config.apiExportTimeoutMs).toBe(config.DEFAULT_API_EXPORT_TIMEOUT_MS);
  });

  it("parses valid configured timeouts", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", "45000");
    vi.stubEnv("NEXT_PUBLIC_API_EXPORT_TIMEOUT_MS", "180000");

    const config = await import("@/lib/config/env");

    expect(config.apiTimeoutMs).toBe(45_000);
    expect(config.apiExportTimeoutMs).toBe(180_000);
  });

  it.each(["NaN", "0", "-1"])(
    "falls back when the normal timeout is invalid (%s)",
    async (invalidTimeout) => {
      vi.stubEnv("NEXT_PUBLIC_API_TIMEOUT_MS", invalidTimeout);
      vi.resetModules();

      const config = await import("@/lib/config/env");

      expect(config.apiTimeoutMs).toBe(config.DEFAULT_API_TIMEOUT_MS);
    },
  );
});
