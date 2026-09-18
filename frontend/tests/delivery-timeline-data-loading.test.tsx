import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDeliveryPage from "@/app/(app)/projects/[id]/delivery/page";

const mocks = vi.hoisted(() => ({
  baseline: vi.fn(),
  forecastOverview: vi.fn(),
  forecastSnapshot: vi.fn(),
  getAuthMe: vi.fn(),
  getProject: vi.fn(),
  search: "view=timeline",
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "project-1" }),
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@/features/auth", () => ({
  getAuthMe: mocks.getAuthMe,
  resolveProjectUiCapabilities: () => ({
    canAccessDelivery: true,
    canAccessToday: true,
    canManageProjectTasks: true,
  }),
  storeAuthMe: vi.fn(),
}));

vi.mock("@/features/projects", () => ({
  getProject: mocks.getProject,
  recordProjectTaskExecutionUpdate: vi.fn(),
  updateProjectTask: vi.fn(),
}));

vi.mock("@/features/projects/planning", () => ({
  decorateProjectPlan: (project: unknown) => project,
}));

vi.mock("@/features/planning", () => ({
  getProjectBaseline: mocks.baseline,
  getProjectForecastOverview: mocks.forecastOverview,
  getProjectForecastSnapshot: mocks.forecastSnapshot,
}));

vi.mock("@/features/tasks", () => ({
  getTaskExecutionUpdates: vi.fn(async () => []),
}));

vi.mock("@/hooks/use-project-members", () => ({
  useProjectMembers: () => ({ error: null, isLoading: false, members: [] }),
}));

vi.mock("@/lib/workspace/persisted-workspace-state", () => ({
  readPersistedWorkspaceState: () => ({
    activeFilter: "all",
    searchTerm: "",
    view: "list",
  }),
  writePersistedWorkspaceState: vi.fn(),
}));

vi.mock("@/components/project", () => ({
  CompactProjectWorkspaceLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ProjectLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/projects/project-workspace-tasks", () => ({
  ProjectWorkspaceTasks: () => <div>Task grid</div>,
}));

vi.mock("@/components/today/today-workspace", () => ({
  TodayWorkspace: () => <div>Today workspace</div>,
}));

vi.mock("@/components/delivery/delivery-timeline", () => ({
  DeliveryTimeline: ({
    activeBaseline,
    currentForecast,
    tasks,
  }: {
    activeBaseline: { id: string } | null;
    currentForecast: { snapshot: { snapshotId: string } } | null;
    tasks: Array<{ id: string }>;
  }) => (
    <div aria-label="Timeline probe">
      tasks:{tasks.map((task) => task.id).join(",")};forecast:
      {currentForecast?.snapshot.snapshotId ?? "none"};baseline:
      {activeBaseline?.id ?? "none"}
    </div>
  ),
}));

describe("Delivery Timeline reference loading", () => {
  beforeEach(() => {
    mocks.search = "view=timeline";
    mocks.baseline.mockReset();
    mocks.forecastOverview.mockReset();
    mocks.forecastSnapshot.mockReset();
    mocks.getAuthMe.mockReset();
    mocks.getProject.mockReset();
    mocks.getAuthMe.mockResolvedValue({
      permissions: [{ key: "project.read" }, { key: "task.update" }],
      roles: [{ name: "PROJECT_MANAGER" }],
      user: { id: "user-1" },
    });
    mocks.getProject.mockResolvedValue({
      id: "project-1",
      name: "Delivery",
      status: "active",
      tasks: [
        {
          id: "task-1",
          priority: "medium",
          projectId: "project-1",
          status: "todo",
          taskKind: "standard",
          title: "Deliver",
        },
      ],
    });
    mocks.forecastOverview.mockResolvedValue({
      activeBaseline: { id: "baseline-2", status: "approved" },
      currentForecast: { snapshotId: "forecast-7" },
    });
    mocks.forecastSnapshot.mockResolvedValue({
      snapshot: { snapshotId: "forecast-7" },
      taskSchedules: [],
    });
    mocks.baseline.mockResolvedValue({
      id: "baseline-2",
      isCurrent: true,
      status: "approved",
      tasks: [],
    });
  });

  it("loads the exact official snapshot and active baseline only for Timeline", async () => {
    render(<ProjectDeliveryPage />);

    expect(await screen.findByLabelText("Timeline probe")).toHaveTextContent(
      "tasks:task-1;forecast:forecast-7;baseline:baseline-2",
    );
    expect(mocks.forecastOverview).toHaveBeenCalledWith("project-1");
    expect(mocks.forecastSnapshot).toHaveBeenCalledWith(
      "project-1",
      "forecast-7",
    );
    expect(mocks.baseline).toHaveBeenCalledWith("project-1", "baseline-2");
  });

  it("keeps Target and Actual available when reference access is denied", async () => {
    mocks.forecastOverview.mockRejectedValue(new Error("Forbidden"));
    render(<ProjectDeliveryPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Timeline probe")).toHaveTextContent(
        "tasks:task-1;forecast:none;baseline:none",
      );
    });
  });

  it("does not request Forecast or Baseline for non-Timeline views", async () => {
    mocks.search = "view=list";
    render(<ProjectDeliveryPage />);

    expect(await screen.findByText("Task grid")).toBeInTheDocument();
    expect(mocks.forecastOverview).not.toHaveBeenCalled();
    expect(mocks.forecastSnapshot).not.toHaveBeenCalled();
    expect(mocks.baseline).not.toHaveBeenCalled();
  });
});
