import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import IssuesPage from "@/app/(app)/issues/page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("Issues page", () => {
  it("opens Projects instead of a global register", async () => {
    render(<IssuesPage />);
    expect(screen.getByText("Opening Projects...")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects"));
  });
});
