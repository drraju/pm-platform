import { describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect,
}));

import ExecutivePage from "@/app/(dashboard)/executive/page";

describe("programs replace the executive scorecard", () => {
  it("does not keep a second executive screen", () => {
    ExecutivePage();
    expect(redirect).toHaveBeenCalledWith("/programs");
  });
});
