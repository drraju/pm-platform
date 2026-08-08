import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDeliveryPage from "@/app/(app)/projects/[id]/delivery/page";

const mocks = vi.hoisted(() => ({
  getAuthMe: vi.fn(),
  getProject: vi.fn(),
  getProjectMembers: vi.fn(),
  replace: vi.fn(),
  writePersistedWorkspaceState: vi.fn(),
  readPersistedWorkspaceState: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "project-1" }),
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams("view=board"),
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
  decorateProjectPlan: (project: unknown) => project,
  getProject: mocks.getProject,
  recordProjectTaskExecutionUpdate: vi.fn(),
  updateProjectTask: vi.fn(),
}));

vi.mock("@/features/projects/planning", () => ({
  decorateProjectPlan: (project: unknown) => project,
}));

vi.mock("@/features/tasks", () => ({
  getTaskExecutionUpdates: vi.fn(async () => []),
}));

vi.mock("@/hooks/use-project-members", () => ({
  useProjectMembers: () => ({
    error: null,
    isLoading: false,
    members: [],
  }),
}));

vi.mock("@/lib/workspace/persisted-workspace-state", () => ({
  readPersistedWorkspaceState: mocks.readPersistedWorkspaceState,
  writePersistedWorkspaceState: mocks.writePersistedWorkspaceState,
}));

vi.mock("@/components/project", () => ({
  CompactProjectWorkspaceLayout: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>,
  ProjectLayout: ({
    children,
    renderHeader,
  }: {
    children: React.ReactNode;
    renderHeader: (content: { title: string }) => React.ReactNode;
  }) => (
    <div>
      {renderHeader({ title: "Delivery Program" })}
      {children}
    </div>
  ),
}));

vi.mock("@/components/foundation", async () => {
  const actual = await vi.importActual<typeof import("@/components/foundation")>(
    "@/components/foundation",
  );
  return {
    ...actual,
    WorkspaceHeader: ({ title }: { title: React.ReactNode }) => (
      <header>{title}</header>
    ),
  };
});

vi.mock("@/components/projects/project-workspace-tasks", () => ({
  ProjectWorkspaceTasks: () => <div>Task grid</div>,
}));

vi.mock("@/components/today/today-workspace", () => ({
  TodayWorkspace: () => <div>Today workspace</div>,
}));

describe("Delivery page toolbar hierarchy", () => {
  beforeEach(() => {
    mocks.getAuthMe.mockReset();
    mocks.getProject.mockReset();
    mocks.replace.mockReset();
    mocks.readPersistedWorkspaceState.mockReset();
    mocks.writePersistedWorkspaceState.mockReset();

    mocks.readPersistedWorkspaceState.mockReturnValue({
      activeFilter: "all",
      searchTerm: "",
      view: "board",
    });
    mocks.getAuthMe.mockResolvedValue({
      permissions: [{ key: "project.read" }, { key: "task.update" }],
      roles: [{ name: "PROJECT_MANAGER" }],
      user: { id: "user-1" },
    });
    mocks.getProject.mockResolvedValue({
      id: "project-1",
      name: "Delivery Program",
      status: "active",
      tasks: [
        {
          id: "task-1",
          priority: "high",
          projectId: "project-1",
          status: "todo",
          taskKind: "standard",
          title: "Ship cutover",
        },
        {
          id: "task-2",
          priority: "medium",
          projectId: "project-1",
          status: "blocked",
          taskKind: "standard",
          title: "Unblock vendor",
        },
        {
          dueDate: "2020-01-01",
          id: "task-3",
          priority: "low",
          projectId: "project-1",
          status: "todo",
          taskKind: "standard",
          title: "Late validation",
        },
      ],
    });
  });

  it("keeps views primary and consolidates filters into selects + More Filters", async () => {
    render(<ProjectDeliveryPage />);

    await waitFor(() => {
      expect(screen.getByText("Task grid")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Delivery views")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Board" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /More Filters/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Awaiting Update/i })).not.toBeInTheDocument();

    expect(screen.getByLabelText("Delivery attention summary")).toHaveTextContent(
      "3 tasks",
    );
    expect(screen.getByLabelText("Delivery attention summary")).toHaveTextContent(
      "1 blocked",
    );
    expect(screen.getByLabelText("Delivery attention summary")).toHaveTextContent(
      "1 overdue",
    );

    fireEvent.click(screen.getByRole("button", { name: /More Filters/i }));
    fireEvent.click(screen.getByRole("option", { name: /Overdue/i }));

    expect(screen.getByLabelText("Active delivery filters")).toHaveTextContent(
      "Overdue",
    );
  });

  it("persists composable filter state while keeping legacy activeFilter", async () => {
    render(<ProjectDeliveryPage />);

    await waitFor(() => {
      expect(screen.getByText("Task grid")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Owner"), {
      target: { value: "mine" },
    });

    await waitFor(() => {
      expect(mocks.writePersistedWorkspaceState).toHaveBeenCalledWith(
        "delivery:v2:project-1",
        expect.objectContaining({
          activeFilter: "mine",
          owner: "mine",
          status: "all",
          view: "board",
        }),
      );
    });
  });
});
