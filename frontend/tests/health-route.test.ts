import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("frontend health route", () => {
  it("returns an application health payload", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(payload).toEqual(
      expect.objectContaining({
        app: expect.objectContaining({
          name: "pm-platform-frontend",
          status: "up",
        }),
        status: "ok",
      }),
    );
  });
});
