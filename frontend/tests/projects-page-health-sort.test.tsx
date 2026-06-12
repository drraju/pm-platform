import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/app/(app)/projects/page";

const projectMocks = vi.hoisted(() => ({
  getProject: vi.fn(async (projectId: string) => ({
    createdAt:
      projectId === "green-project"
        ? "2026-06-03T10:00:00.000Z"
        : "2026-06-01T10:00:00.000Z",
    health:
      projectId === "green-project"
        ? { reasons: ["No health issues identified"], status: "GREEN" }
        : { reasons: ["1 critical issue open"], status: "RED" },
    id: projectId,
    members: [],
  })),
  getProjects: vi.fn(async () => [
    {
      createdAt: "2026-06-03T10:00:00.000Z",
      id: "green-project",
      name: "Green Delivery",
      status: "active",
    },
    {
      createdAt: "2026-06-01T10:00:00.000Z",
      id: "red-project",
      name: "Red Recovery",
      status: "active",
    },
  ]),
}));

vi.mock("@/features/auth", () => ({
  getStoredAccessToken: () => "test-token",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/features/projects", () => ({
  createProject: vi.fn(),
  getAssignableUsers: vi.fn(async () => []),
  getProject: projectMocks.getProject,
  getProjects: projectMocks.getProjects,
}));

vi.mock("@/features/users", () => ({
  getAssignableUsers: vi.fn(async () => []),
}));

describe("Projects page health sorting", () => {
  it("sorts projects by health", async () => {
    render(<ProjectsPage />);

    await screen.findByText("Green Delivery");

    fireEvent.change(screen.getByLabelText(/sort projects/i), {
      target: { value: "health_desc" },
    });

    await waitFor(() => {
      const rows = screen.getAllByRole("link");
      expect(rows[0]).toHaveAccessibleName("Open Red Recovery");
      expect(rows[1]).toHaveAccessibleName("Open Green Delivery");
    });
  });
});
