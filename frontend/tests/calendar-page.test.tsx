import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarPage from "@/app/(app)/calendar/page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("Calendar page", () => {
  it("opens Projects instead of enterprise calendars", async () => {
    render(<CalendarPage />);
    expect(screen.getByText("Opening Projects...")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/projects"));
  });
});
