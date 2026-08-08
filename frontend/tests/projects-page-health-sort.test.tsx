import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  getAuthMe: vi.fn(async () => ({
    permissions: [{ id: "permission-project-read", key: "project.read" }],
    roles: [],
    user: {
      email: "executive@example.com",
      firstName: "Executive",
      id: "user-1",
      lastName: "User",
      roleId: "role-1",
      status: "active",
    },
  })),
  getStoredAccessToken: () => "test-token",
  getStoredPermissionKeys: () => ["project.read"],
  hasPermission: (permissionKeys: string[], requiredPermission: string) =>
    permissionKeys.includes(requiredPermission),
  storeAuthMe: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: (href: string) => {
      window.history.replaceState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/features/projects", () => ({
  captureProjectBaseline: vi.fn(),
  createProject: vi.fn(),
  createProjectTaskDependency: vi.fn(),
  deleteProjectTaskDependency: vi.fn(),
  getAssignableUsers: vi.fn(async () => []),
  getProjectBaseline: vi.fn(async () => ({
    capturedAt: "2026-06-01T10:00:00.000Z",
    capturedById: "user-1",
    id: "baseline-1",
    isCurrent: true,
    name: "Approved Delivery Baseline",
    projectId: "project-1",
    status: "approved",
    tasks: [],
    versionNumber: 1,
  })),
  getProjectBaselines: vi.fn(async () => []),
  getProject: projectMocks.getProject,
  getProjectTaskDependencies: vi.fn(async () => []),
  getProjects: projectMocks.getProjects,
  updateProjectTaskDependency: vi.fn(),
}));

vi.mock("@/features/users", () => ({
  getAssignableUsers: vi.fn(async () => []),
}));

describe("Projects page health sorting", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/projects");
  });

  it("preserves health drilldown filters from the URL", async () => {
    window.history.replaceState({}, "", "/projects?health=RED&sort=health_desc");

    render(<ProjectsPage />);

    await screen.findByText("Red Recovery");

    expect(screen.getByDisplayValue("Red")).toBeInTheDocument();
    expect(screen.queryByText("Green Delivery")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(window.location.search).toBe("?health=RED&sort=health_desc");
  });

  it("preserves incoming project filters during client-side navigation", async () => {
    window.history.replaceState({}, "", "/executive");
    window.history.pushState({}, "", "/projects?health=RED&sort=health_desc");

    render(<ProjectsPage />);

    await screen.findByText("Red Recovery");

    expect(screen.getByDisplayValue("Red")).toBeInTheDocument();
    expect(screen.queryByText("Green Delivery")).not.toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe(
      "/projects?health=RED&sort=health_desc",
    );
  });

  it("sorts projects by health from drilldown URL params", async () => {
    window.history.replaceState({}, "", "/projects?sort=health_desc");

    render(<ProjectsPage />);

    await screen.findByText("Green Delivery");

    await waitFor(() => {
      const rows = screen.getAllByRole("link");
      expect(rows[0]).toHaveAccessibleName("Open Red Recovery");
      expect(rows[1]).toHaveAccessibleName("Open Green Delivery");
    });
  });

  it("restores filters after browser back and forward navigation", async () => {
    const { rerender } = render(<ProjectsPage />);

    await screen.findByText("Green Delivery");

    act(() => {
      window.history.pushState({}, "", "/projects?health=RED&sort=health_desc");
      rerender(<ProjectsPage />);
    });

    expect(screen.queryByText("Green Delivery")).not.toBeInTheDocument();
    expect(screen.getByText("Red Recovery")).toBeInTheDocument();

    act(() => {
      window.history.replaceState({}, "", "/projects");
      rerender(<ProjectsPage />);
    });

    expect(screen.getByText("Green Delivery")).toBeInTheDocument();
    expect(screen.getByText("Red Recovery")).toBeInTheDocument();

    act(() => {
      window.history.replaceState({}, "", "/projects?health=RED&sort=health_desc");
      rerender(<ProjectsPage />);
    });

    expect(screen.queryByText("Green Delivery")).not.toBeInTheDocument();
    expect(screen.getByText("Red Recovery")).toBeInTheDocument();
  });
});
