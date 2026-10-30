import { describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect,
}));

import ExecutivePage from "@/app/(dashboard)/executive/page";

describe("executive route", () => {
  it("opens Programs", () => {
    ExecutivePage();
    expect(redirect).toHaveBeenCalledWith("/programs");
  });
});
