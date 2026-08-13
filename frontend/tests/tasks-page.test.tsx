import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TasksPage from "@/app/(app)/tasks/page";

const taskMocks = vi.hoisted(() => ({
  getMyTasks: vi.fn(),
  getTasks: vi.fn(),
}));

const projectMocks = vi.hoisted(() => ({
  getProjectMembers: vi.fn(),
  getProjects: vi.fn(),
  recordProjectTaskExecutionUpdate: vi.fn(),
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
    roles: [{ id: "role-1", name: "TEAM_MEMBER", permissions: [] }],
    user: {
      email: "member@example.com",
      firstName: "Team",
      id: "user-1",
      lastName: "Member",
      role: { id: "role-1", name: "TEAM_MEMBER", permissions: [] },
      status: "active",
    },
  })),
  getStoredPermissionKeys: () => [
    "project.read",
    "task.update",
    "task.comment",
  ],
  hasPermission: (permissionKeys: string[], requiredPermission: string) =>
    permissionKeys.includes(requiredPermission),
  resolveProjectUiCapabilities: ({
    currentUserId,
    permissionKeys = [],
    task,
  }: {
    currentUserId?: string | null;
    permissionKeys?: string[];
    task?: { assigneeId?: string | null } | null;
  }) => {
    const canUpdateTask =
      permissionKeys.includes("task.update") &&
      Boolean(currentUserId) &&
      task?.assigneeId === currentUserId;
    return {
      canAccessDailyReview: false,
      canAccessDelivery: true,
      canAccessGovern: false,
      canAccessPlanning: false,
      canAccessToday: true,
      canApproveDocuments: false,
      canContributeDocuments: true,
      canEditDocument: false,
      canEditExecution: canUpdateTask,
      canEditPlanning: false,
      canExecuteAssignedTask: canUpdateTask,
      canManageDocuments: false,
      canManageProjectTasks: false,
      canManageTeam: false,
      canReassignTask: canUpdateTask,
      canUpdateTask,
      canUploadDocuments: true,
    };
  },
  storeAuthMe: vi.fn(),
}));

vi.mock("@/features/projects", () => ({
  getProjectMembers: projectMocks.getProjectMembers,
  getProjects: projectMocks.getProjects,
  recordProjectTaskExecutionUpdate: projectMocks.recordProjectTaskExecutionUpdate,
}));

vi.mock("@/features/tasks", () => ({
  getMyTasks: taskMocks.getMyTasks,
  getTasks: taskMocks.getTasks,
}));

describe("Tasks page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/tasks");
    taskMocks.getMyTasks.mockReset();
    taskMocks.getTasks.mockReset();
    projectMocks.getProjectMembers.mockReset();
    projectMocks.getProjects.mockReset();
    projectMocks.recordProjectTaskExecutionUpdate.mockReset();

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
    const overdueDate = new Date(today.getTime() - oneDay)
      .toISOString()
      .slice(0, 10);
    const dueToday = today.toISOString().slice(0, 10);
    const futureDate = new Date(today.getTime() + 7 * oneDay)
      .toISOString()
      .slice(0, 10);

    const visibleTasks = [
      {
        assigneeId: "user-1",
        dueDate: overdueDate,
        id: "task-overdue",
        priority: "high",
        projectId: "project-1",
        status: "blocked",
        title: "Resolve collector rollout blocker",
      },
      {
        assigneeId: "user-1",
        dueDate: dueToday,
        id: "task-due-today",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Prepare steering update",
      },
      {
        assigneeId: "user-1",
        dueDate: futureDate,
        id: "task-future",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Plan executive readout",
      },
    ];

    taskMocks.getTasks.mockResolvedValue(visibleTasks);
    taskMocks.getMyTasks.mockResolvedValue(visibleTasks);

    render(<TasksPage />);

    await waitFor(() => {
      expect(taskMocks.getTasks).toHaveBeenCalled();
    });

    expect(screen.getByRole("heading", { name: "My Tasks" })).toBeInTheDocument();
    expect(
      screen.getByText("Your assigned work across projects."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Resolve collector rollout blocker"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Prepare steering update"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Plan executive readout"),
    ).not.toBeInTheDocument();
    expect(window.location.search).toBe("?scope=all&timing=overdue");
  });

  it("defaults to all personal work with hierarchy context and direct counts", async () => {
    const parent = {
      assigneeId: "user-1",
      assignee: {
        email: "team.member@example.com",
        firstName: "Team",
        id: "user-1",
        lastName: "Member",
        status: "active",
      },
      id: "task-a",
      percentComplete: 40,
      priority: "high",
      projectId: "project-1",
      sequenceNumber: 1,
      status: "in_progress",
      taskKind: "standard",
      title: "Task A",
    };
    const delegatedChild = {
      assigneeId: "user-2",
      assignee: {
        email: "ben@example.com",
        firstName: "Ben",
        id: "user-2",
        lastName: "Ng",
        status: "active",
      },
      id: "task-a-1",
      parentTaskId: "task-a",
      percentComplete: 20,
      priority: "medium",
      projectId: "project-1",
      sequenceNumber: 1,
      status: "todo",
      taskKind: "standard",
      title: "Sub-task A1",
    };
    const assignedChild = {
      assigneeId: "user-1",
      id: "task-a-2",
      parentTaskId: "task-a",
      percentComplete: 10,
      priority: "medium",
      projectId: "project-1",
      sequenceNumber: 2,
      status: "todo",
      taskKind: "standard",
      title: "Sub-task A2",
    };
    const unrelated = {
      assigneeId: "user-2",
      id: "task-b",
      percentComplete: 0,
      priority: "low",
      projectId: "project-1",
      sequenceNumber: 2,
      status: "todo",
      taskKind: "standard",
      title: "Unrelated task",
    };

    taskMocks.getMyTasks.mockResolvedValue([
      parent,
      delegatedChild,
      assignedChild,
      unrelated,
    ]);

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Task A")).toBeInTheDocument();
    });

    expect(window.location.pathname + window.location.search).toBe("/tasks");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Sub-task A1")).toBeInTheDocument();
    expect(screen.getByText("Sub-task A2")).toBeInTheDocument();
    expect(screen.getByText("Ben Ng")).toBeInTheDocument();
    expect(screen.queryByText("Unrelated task")).not.toBeInTheDocument();
    expect(screen.getByText("2 direct tasks · All")).toBeInTheDocument();
    expect(screen.getByLabelText("Status for Task A")).toBeEnabled();
    expect(screen.getByLabelText("Status for Sub-task A2")).toBeEnabled();
    expect(screen.queryByLabelText("Status for Sub-task A1")).not.toBeInTheDocument();
  });

  it("shows parent context for a subtask assignee without sibling context", async () => {
    taskMocks.getMyTasks.mockResolvedValue([
      {
        assigneeId: "user-2",
        id: "task-a",
        percentComplete: 40,
        priority: "high",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "in_progress",
        taskKind: "standard",
        title: "Task A",
      },
      {
        assigneeId: "user-1",
        id: "task-a-1",
        parentTaskId: "task-a",
        percentComplete: 20,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 1,
        status: "todo",
        taskKind: "standard",
        title: "Sub-task A1",
      },
      {
        assigneeId: "user-3",
        id: "task-a-2",
        parentTaskId: "task-a",
        percentComplete: 10,
        priority: "medium",
        projectId: "project-1",
        sequenceNumber: 2,
        status: "todo",
        taskKind: "standard",
        title: "Sub-task A2",
      },
    ]);

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Task A")).toBeInTheDocument();
    });

    expect(screen.getByText("Sub-task A1")).toBeInTheDocument();
    expect(screen.queryByText("Sub-task A2")).not.toBeInTheDocument();
    expect(screen.getByText("1 direct task · All")).toBeInTheDocument();
    expect(screen.queryByLabelText("Status for Task A")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Status for Sub-task A1")).toBeEnabled();
  });

  it("filters personal work by Today, Upcoming, and Overdue tabs", async () => {
    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const todayDate = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today.getTime() + oneDay).toISOString().slice(0, 10);
    const overdue = new Date(today.getTime() - oneDay).toISOString().slice(0, 10);

    taskMocks.getMyTasks.mockResolvedValue([
      {
        assigneeId: "user-1",
        dueDate: todayDate,
        id: "task-today",
        priority: "high",
        projectId: "project-1",
        status: "todo",
        taskKind: "standard",
        title: "Due today task",
      },
      {
        assigneeId: "user-1",
        dueDate: tomorrow,
        id: "task-upcoming",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        taskKind: "standard",
        title: "Upcoming task",
      },
      {
        assigneeId: "user-1",
        dueDate: overdue,
        id: "task-overdue",
        priority: "medium",
        projectId: "project-1",
        status: "blocked",
        taskKind: "standard",
        title: "Overdue task",
      },
    ]);

    const { rerender } = render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("Due today task")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Today" }));
      rerender(<TasksPage />);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText("Due today task")).toBeInTheDocument();
    });
    expect(screen.queryByText("Upcoming task")).not.toBeInTheDocument();
    expect(screen.queryByText("Overdue task")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Upcoming" }));
      rerender(<TasksPage />);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText("Upcoming task")).toBeInTheDocument();
      expect(screen.queryByText("Due today task")).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Overdue" }));
      rerender(<TasksPage />);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText("Overdue task")).toBeInTheDocument();
      expect(screen.queryByText("Upcoming task")).not.toBeInTheDocument();
    });
  });

  it("filters by priority and sorts high priority before lower priority", async () => {
    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const sooner = new Date(today.getTime() + oneDay).toISOString().slice(0, 10);
    const later = new Date(today.getTime() + 3 * oneDay)
      .toISOString()
      .slice(0, 10);

    const assignedTasks = [
      {
        assigneeId: "user-1",
        dueDate: sooner,
        id: "task-low",
        priority: "low",
        projectId: "project-1",
        status: "todo",
        title: "Low priority task",
      },
      {
        assigneeId: "user-1",
        dueDate: later,
        id: "task-high",
        priority: "high",
        projectId: "project-1",
        status: "todo",
        title: "High priority task",
      },
      {
        assigneeId: "user-1",
        dueDate: sooner,
        id: "task-medium",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Medium priority task",
      },
    ];

    taskMocks.getMyTasks.mockResolvedValue(assignedTasks);

    const { rerender } = render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText("High priority task")).toBeInTheDocument();
    });

    const titles = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.querySelector("p")?.textContent);
    expect(titles).toEqual([
      "High priority task",
      "Medium priority task",
      "Low priority task",
    ]);

    await act(async () => {
      window.history.replaceState({}, "", "/tasks?priority=high");
      rerender(<TasksPage />);
      await Promise.resolve();
    });

    expect(screen.getByText("High priority task")).toBeInTheDocument();
    expect(screen.queryByText("Medium priority task")).not.toBeInTheDocument();
    expect(screen.queryByText("Low priority task")).not.toBeInTheDocument();
  });

  it("preserves overdue drilldown filters during client-side navigation", async () => {
    window.history.replaceState({}, "", "/executive");
    window.history.pushState({}, "", "/tasks?scope=all&timing=overdue");

    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const overdueDate = new Date(today.getTime() - oneDay)
      .toISOString()
      .slice(0, 10);
    const futureDate = new Date(today.getTime() + 7 * oneDay)
      .toISOString()
      .slice(0, 10);

    const visibleTasks = [
      {
        assigneeId: "user-1",
        dueDate: overdueDate,
        id: "task-overdue",
        priority: "high",
        projectId: "project-1",
        status: "blocked",
        title: "Resolve collector rollout blocker",
      },
      {
        assigneeId: "user-1",
        dueDate: futureDate,
        id: "task-future",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Plan executive readout",
      },
    ];

    taskMocks.getTasks.mockResolvedValue(visibleTasks);
    taskMocks.getMyTasks.mockResolvedValue(visibleTasks);

    render(<TasksPage />);

    await waitFor(() => {
      expect(taskMocks.getTasks).toHaveBeenCalled();
    });

    expect(
      screen.getByText("Resolve collector rollout blocker"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Plan executive readout"),
    ).not.toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe(
      "/tasks?scope=all&timing=overdue",
    );
  });

  it("restores overdue filters after browser back and forward navigation", async () => {
    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const overdueDate = new Date(today.getTime() - oneDay)
      .toISOString()
      .slice(0, 10);
    const futureDate = new Date(today.getTime() + 7 * oneDay)
      .toISOString()
      .slice(0, 10);

    const visibleTasks = [
      {
        assigneeId: "user-1",
        dueDate: overdueDate,
        id: "task-overdue",
        priority: "high",
        projectId: "project-1",
        status: "blocked",
        title: "Resolve collector rollout blocker",
      },
      {
        assigneeId: "user-1",
        dueDate: futureDate,
        id: "task-future",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Plan executive readout",
      },
    ];

    taskMocks.getTasks.mockResolvedValue(visibleTasks);
    taskMocks.getMyTasks.mockResolvedValue(visibleTasks);

    const { rerender } = render(<TasksPage />);

    await waitFor(() => {
      expect(taskMocks.getMyTasks).toHaveBeenCalled();
    });

    await act(async () => {
      window.history.pushState({}, "", "/tasks?scope=all&timing=overdue");
      rerender(<TasksPage />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(taskMocks.getTasks).toHaveBeenCalled();
    });

    expect(
      screen.getByText("Resolve collector rollout blocker"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Plan executive readout"),
    ).not.toBeInTheDocument();

    await act(async () => {
      window.history.replaceState({}, "", "/tasks");
      rerender(<TasksPage />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(taskMocks.getMyTasks).toHaveBeenCalledTimes(2);
    });

    expect(
      screen.getByText("Resolve collector rollout blocker"),
    ).toBeInTheDocument();
    expect(screen.getByText("Plan executive readout")).toBeInTheDocument();

    await act(async () => {
      window.history.replaceState({}, "", "/tasks?scope=all&timing=overdue");
      rerender(<TasksPage />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(taskMocks.getTasks).toHaveBeenCalledTimes(2);
    });

    expect(
      screen.getByText("Resolve collector rollout blocker"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Plan executive readout"),
    ).not.toBeInTheDocument();
  });
});
