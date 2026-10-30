import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RisksPage from "@/app/(app)/risks/page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("Risks page", () => {
  it("opens Projects instead of a global register", async () => {
    render(<RisksPage />);
    expect(screen.getByText("Opening Projects...")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects"));
  });
});
