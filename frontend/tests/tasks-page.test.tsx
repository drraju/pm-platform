import React from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TasksPage from "@/app/(app)/tasks/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (href: string) => {
      window.history.replaceState({}, "", href);
    },
  }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

describe("Tasks page", () => {
  it("sends the old My Tasks address to Today", async () => {
    window.history.replaceState({}, "", "/tasks?scope=all&timing=overdue");
    render(<TasksPage />);
    await waitFor(() => {
      expect(window.location.pathname).toBe("/today");
    });
  });
});
