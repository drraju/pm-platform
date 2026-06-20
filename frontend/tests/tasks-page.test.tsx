import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TasksPage from "@/app/(app)/tasks/page";

const taskMocks = vi.hoisted(() => ({
  getMyTasks: vi.fn(),
  getTasks: vi.fn(),
  updateTask: vi.fn(),
}));

const projectMocks = vi.hoisted(() => ({
  getProjectMembers: vi.fn(),
  getProjects: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({
    replace: (href: string) => {
      window.history.replaceState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/features/auth", () => ({
  getAuthMe: vi.fn(async () => ({
    permissions: [
      { id: "permission-project-read", key: "project.read" },
      { id: "permission-task-update-any", key: "task.update" },
      { id: "permission-task-comment", key: "task.comment" },
    ],
    roles: [{ id: "role-1", name: "Executive", permissions: [] }],
    user: {
      email: "executive@example.com",
      firstName: "Executive",
      id: "user-1",
      lastName: "User",
      role: { id: "role-1", name: "Executive", permissions: [] },
      status: "active",
    },
  })),
  getStoredPermissionKeys: () => ["project.read", "task.update", "task.comment"],
  hasPermission: (permissionKeys: string[], requiredPermission: string) =>
    permissionKeys.includes(requiredPermission),
  storeAuthMe: vi.fn(),
}));

vi.mock("@/features/projects", () => ({
  getProjectMembers: projectMocks.getProjectMembers,
  getProjects: projectMocks.getProjects,
}));

vi.mock("@/features/tasks", () => ({
  getMyTasks: taskMocks.getMyTasks,
  getTasks: taskMocks.getTasks,
  updateTask: taskMocks.updateTask,
}));

describe("Tasks page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/tasks");
    taskMocks.getMyTasks.mockReset();
    taskMocks.getTasks.mockReset();
    taskMocks.updateTask.mockReset();
    projectMocks.getProjectMembers.mockReset();
    projectMocks.getProjects.mockReset();

    projectMocks.getProjects.mockResolvedValue([
      {
        id: "project-1",
        name: "Customer Experience Platform Upgrade",
        status: "active",
      },
    ]);
    projectMocks.getProjectMembers.mockResolvedValue([]);
  });

  it("uses all-visible task scope and honors overdue timing filters from executive drilldowns", async () => {
    window.history.replaceState({}, "", "/tasks?scope=all&timing=overdue");

    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const overdueDate = new Date(today.getTime() - oneDay).toISOString().slice(0, 10);
    const dueToday = today.toISOString().slice(0, 10);
    const futureDate = new Date(today.getTime() + 7 * oneDay).toISOString().slice(0, 10);

    taskMocks.getTasks.mockResolvedValue([
      {
        dueDate: overdueDate,
        id: "task-overdue",
        priority: "high",
        projectId: "project-1",
        status: "blocked",
        title: "Resolve collector rollout blocker",
      },
      {
        dueDate: dueToday,
        id: "task-due-today",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Prepare steering update",
      },
      {
        dueDate: futureDate,
        id: "task-future",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Plan executive readout",
      },
    ]);
    taskMocks.getMyTasks.mockResolvedValue([]);

    render(<TasksPage />);

    await waitFor(() => {
      expect(taskMocks.getTasks).toHaveBeenCalled();
    });

    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("All visible tasks")).toBeInTheDocument();
    expect(screen.getByText("Resolve collector rollout blocker")).toBeInTheDocument();
    expect(screen.queryByText("Prepare steering update")).not.toBeInTheDocument();
    expect(screen.queryByText("Plan executive readout")).not.toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(window.location.search).toBe("?scope=all&timing=overdue");
  });

  it("preserves overdue drilldown filters during client-side navigation", async () => {
    window.history.replaceState({}, "", "/executive");
    window.history.pushState({}, "", "/tasks?scope=all&timing=overdue");

    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const overdueDate = new Date(today.getTime() - oneDay).toISOString().slice(0, 10);
    const futureDate = new Date(today.getTime() + 7 * oneDay).toISOString().slice(0, 10);

    taskMocks.getTasks.mockResolvedValue([
      {
        dueDate: overdueDate,
        id: "task-overdue",
        priority: "high",
        projectId: "project-1",
        status: "blocked",
        title: "Resolve collector rollout blocker",
      },
      {
        dueDate: futureDate,
        id: "task-future",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Plan executive readout",
      },
    ]);
    taskMocks.getMyTasks.mockResolvedValue([]);

    render(<TasksPage />);

    await waitFor(() => {
      expect(taskMocks.getTasks).toHaveBeenCalled();
    });

    expect(screen.getByDisplayValue("All visible tasks")).toBeInTheDocument();
    expect(screen.getByText("Resolve collector rollout blocker")).toBeInTheDocument();
    expect(screen.queryByText("Plan executive readout")).not.toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe(
      "/tasks?scope=all&timing=overdue",
    );
  });

  it("restores overdue filters after browser back and forward navigation", async () => {
    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const overdueDate = new Date(today.getTime() - oneDay).toISOString().slice(0, 10);
    const futureDate = new Date(today.getTime() + 7 * oneDay).toISOString().slice(0, 10);

    taskMocks.getTasks.mockResolvedValue([
      {
        dueDate: overdueDate,
        id: "task-overdue",
        priority: "high",
        projectId: "project-1",
        status: "blocked",
        title: "Resolve collector rollout blocker",
      },
      {
        dueDate: futureDate,
        id: "task-future",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Plan executive readout",
      },
    ]);
    taskMocks.getMyTasks.mockResolvedValue([]);

    const { rerender } = render(<TasksPage />);

    await waitFor(() => {
      expect(taskMocks.getMyTasks).toHaveBeenCalled();
    });

    act(() => {
      window.history.pushState({}, "", "/tasks?scope=all&timing=overdue");
      rerender(<TasksPage />);
    });

    await waitFor(() => {
      expect(taskMocks.getTasks).toHaveBeenCalled();
    });

    expect(screen.getByText("Resolve collector rollout blocker")).toBeInTheDocument();
    expect(screen.queryByText("Plan executive readout")).not.toBeInTheDocument();

    act(() => {
      window.history.replaceState({}, "", "/tasks");
      rerender(<TasksPage />);
    });

    expect(screen.getByText("Resolve collector rollout blocker")).toBeInTheDocument();
    expect(screen.getByText("Plan executive readout")).toBeInTheDocument();

    act(() => {
      window.history.replaceState({}, "", "/tasks?scope=all&timing=overdue");
      rerender(<TasksPage />);
    });

    expect(screen.getByText("Resolve collector rollout blocker")).toBeInTheDocument();
    expect(screen.queryByText("Plan executive readout")).not.toBeInTheDocument();
  });
});
