import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PortfolioPage from "@/app/(app)/portfolio/page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("Portfolio page", () => {
  it("opens Programs", async () => {
    render(<PortfolioPage />);
    expect(screen.getByText("Opening Programs...")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/programs"));
  });
});
