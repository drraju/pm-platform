import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExecutiveDashboardPage from "@/app/(dashboard)/executive/page";
import ProjectsPage from "@/app/(app)/projects/page";
import TasksPage from "@/app/(app)/tasks/page";

const portfolioMocks = vi.hoisted(() => ({
  getPortfolioSummary: vi.fn(),
}));

const projectMocks = vi.hoisted(() => ({
  getAssignableUsers: vi.fn(),
  getProject: vi.fn(),
  getProjectMembers: vi.fn(),
  getProjects: vi.fn(),
}));

const taskMocks = vi.hoisted(() => ({
  getMyTasks: vi.fn(),
  getTasks: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        window.history.pushState({}, "", href);
      }}
    >
      {children}
    </a>
  ),
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

vi.mock("@/features/auth", () => ({
  getAuthMe: vi.fn(async () => ({
    permissions: [
      { id: "permission-executive-view", key: "executive.view" },
      { id: "permission-project-read", key: "project.read" },
      { id: "permission-task-update-any", key: "task.update" },
      { id: "permission-task-comment", key: "task.comment" },
    ],
    roles: [{ id: "role-executive", name: "EXECUTIVE", permissions: [] }],
    user: {
      email: "executive@example.com",
      firstName: "Executive",
      id: "user-executive",
      lastName: "User",
      role: { id: "role-executive", name: "EXECUTIVE", permissions: [] },
      status: "active",
    },
  })),
  getStoredAccessToken: () => "test-token",
  getStoredPermissionKeys: () => [
    "executive.view",
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
      canAccessDelivery: permissionKeys.includes("task.update"),
      canAccessGovern: false,
      canAccessPlanning: false,
      canAccessToday: permissionKeys.includes("task.update"),
      canApproveDocuments: false,
      canContributeDocuments: permissionKeys.includes("project.read"),
      canEditDocument: false,
      canEditExecution: canUpdateTask,
      canEditPlanning: false,
      canExecuteAssignedTask: canUpdateTask,
      canManageDocuments: false,
      canManageProjectTasks: false,
      canManageTeam: false,
      canReassignTask: canUpdateTask,
      canUpdateTask,
      canUploadDocuments: permissionKeys.includes("project.read"),
    };
  },
  storeAuthMe: vi.fn(),
}));

vi.mock("@/features/portfolio", () => ({
  getPortfolioSummary: portfolioMocks.getPortfolioSummary,
}));

vi.mock("@/features/projects", () => ({
  captureProjectBaseline: vi.fn(),
  createProject: vi.fn(),
  createProjectTask: vi.fn(),
  createProjectTaskDependency: vi.fn(),
  deleteProject: vi.fn(),
  deleteProjectTask: vi.fn(),
  deleteProjectTaskDependency: vi.fn(),
  getAssignableUsers: projectMocks.getAssignableUsers,
  getProject: projectMocks.getProject,
  getProjectAssumptions: vi.fn(),
  getProjectBaseline: vi.fn(),
  getProjectBaselines: vi.fn(),
  getProjectDependencies: vi.fn(),
  getProjectIssues: vi.fn(),
  getProjectMembers: projectMocks.getProjectMembers,
  getProjectRisks: vi.fn(),
  getProjectTaskDependencies: vi.fn(),
  getProjectTasks: vi.fn(),
  getProjects: projectMocks.getProjects,
  removeProjectMember: vi.fn(),
  updateProject: vi.fn(),
  updateProjectMember: vi.fn(),
  updateProjectTask: vi.fn(),
  updateProjectTaskDependency: vi.fn(),
}));

vi.mock("@/features/tasks", () => ({
  getMyTasks: taskMocks.getMyTasks,
  getTasks: taskMocks.getTasks,
  updateTask: taskMocks.updateTask,
}));

vi.mock("@/features/users", () => ({
  getAssignableUsers: vi.fn(async () => []),
}));

describe("Executive dashboard drilldown consistency", () => {
  beforeEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/executive");
    portfolioMocks.getPortfolioSummary.mockReset();
    projectMocks.getAssignableUsers.mockReset();
    projectMocks.getProject.mockReset();
    projectMocks.getProjectMembers.mockReset();
    projectMocks.getProjects.mockReset();
    taskMocks.getMyTasks.mockReset();
    taskMocks.getTasks.mockReset();
    taskMocks.updateTask.mockReset();

    projectMocks.getAssignableUsers.mockResolvedValue([]);
    projectMocks.getProjectMembers.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the Red Projects widget count aligned during executive drilldown navigation", async () => {
    portfolioMocks.getPortfolioSummary.mockResolvedValue({
      totalProjects: 3,
      greenProjects: 1,
      amberProjects: 1,
      redProjects: 2,
      projectsRequiringAttention: [],
      openRisksBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      openIssuesByPriority: { critical: 0, high: 0, medium: 0, low: 0 },
      overdueTasks: { total: 0, projects: [] },
      upcomingMilestones: [],
    });

    projectMocks.getProjects.mockResolvedValue([
      {
        createdAt: "2026-06-03T10:00:00.000Z",
        id: "project-red-1",
        name: "Core Recovery",
        status: "active",
      },
      {
        createdAt: "2026-06-02T10:00:00.000Z",
        id: "project-amber-1",
        name: "Claims Modernisation",
        status: "active",
      },
      {
        createdAt: "2026-06-02T09:00:00.000Z",
        id: "project-red-2",
        name: "Finance Stabilisation",
        status: "active",
      },
      {
        createdAt: "2026-06-01T10:00:00.000Z",
        id: "project-green-1",
        name: "Data Enablement",
        status: "active",
      },
    ]);
    projectMocks.getProject.mockImplementation(async (projectId: string) => ({
      createdAt: "2026-06-01T10:00:00.000Z",
      health:
        projectId === "project-green-1"
          ? { reasons: ["No health issues identified"], status: "GREEN" }
          : projectId === "project-amber-1"
            ? { reasons: ["1 high risk open"], status: "AMBER" }
            : { reasons: ["1 critical issue open"], status: "RED" },
      id: projectId,
      members: [],
    }));

    const executiveView = render(<ExecutiveDashboardPage />);

    await waitFor(() => {
      expect(portfolioMocks.getPortfolioSummary).toHaveBeenCalled();
    });

    const redProjectsWidget = screen.getByText("Red Projects").closest("a");
    expect(redProjectsWidget).toHaveAttribute(
      "href",
      "/projects?health=RED&sort=health_desc",
    );
    expect(
      within(redProjectsWidget as HTMLAnchorElement).getByText("2"),
    ).toBeInTheDocument();

    fireEvent.click(redProjectsWidget as HTMLAnchorElement);
    expect(window.location.pathname + window.location.search).toBe(
      "/projects?health=RED&sort=health_desc",
    );

    executiveView.unmount();

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(projectMocks.getProjects).toHaveBeenCalled();
    });

    const projectRows = screen.getAllByRole("link");
    expect(projectRows).toHaveLength(2);
    expect(projectRows[0]).toHaveAccessibleName("Open Core Recovery");
    expect(projectRows[1]).toHaveAccessibleName("Open Finance Stabilisation");
  });

  it("keeps the Amber Projects widget count aligned during executive drilldown navigation", async () => {
    portfolioMocks.getPortfolioSummary.mockResolvedValue({
      totalProjects: 4,
      greenProjects: 1,
      amberProjects: 1,
      redProjects: 2,
      projectsRequiringAttention: [],
      openRisksBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      openIssuesByPriority: { critical: 0, high: 0, medium: 0, low: 0 },
      overdueTasks: { total: 0, projects: [] },
      upcomingMilestones: [],
    });

    projectMocks.getProjects.mockResolvedValue([
      {
        createdAt: "2026-06-03T10:00:00.000Z",
        id: "project-red-1",
        name: "Core Recovery",
        status: "active",
      },
      {
        createdAt: "2026-06-02T10:00:00.000Z",
        id: "project-amber-1",
        name: "Claims Modernisation",
        status: "active",
      },
      {
        createdAt: "2026-06-01T10:00:00.000Z",
        id: "project-green-1",
        name: "Data Enablement",
        status: "active",
      },
    ]);
    projectMocks.getProject.mockImplementation(async (projectId: string) => ({
      createdAt: "2026-06-01T10:00:00.000Z",
      health:
        projectId === "project-green-1"
          ? { reasons: ["No health issues identified"], status: "GREEN" }
          : projectId === "project-amber-1"
            ? { reasons: ["1 high risk open"], status: "AMBER" }
            : { reasons: ["1 critical issue open"], status: "RED" },
      id: projectId,
      members: [],
    }));

    const executiveView = render(<ExecutiveDashboardPage />);

    await waitFor(() => {
      expect(portfolioMocks.getPortfolioSummary).toHaveBeenCalled();
    });

    const amberProjectsWidget = screen.getByText("Amber Projects").closest("a");
    expect(amberProjectsWidget).toHaveAttribute(
      "href",
      "/projects?health=AMBER&sort=health_desc",
    );
    expect(
      within(amberProjectsWidget as HTMLAnchorElement).getByText("1"),
    ).toBeInTheDocument();

    fireEvent.click(amberProjectsWidget as HTMLAnchorElement);
    expect(window.location.pathname + window.location.search).toBe(
      "/projects?health=AMBER&sort=health_desc",
    );

    executiveView.unmount();

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(projectMocks.getProjects).toHaveBeenCalled();
    });

    const projectRows = screen.getAllByRole("link");
    expect(projectRows).toHaveLength(1);
    expect(projectRows[0]).toHaveAccessibleName("Open Claims Modernisation");
  });

  it("keeps the Green Projects widget count aligned during executive drilldown navigation", async () => {
    portfolioMocks.getPortfolioSummary.mockResolvedValue({
      totalProjects: 3,
      greenProjects: 1,
      amberProjects: 1,
      redProjects: 1,
      projectsRequiringAttention: [],
      openRisksBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      openIssuesByPriority: { critical: 0, high: 0, medium: 0, low: 0 },
      overdueTasks: { total: 0, projects: [] },
      upcomingMilestones: [],
    });

    projectMocks.getProjects.mockResolvedValue([
      {
        createdAt: "2026-06-03T10:00:00.000Z",
        id: "project-red-1",
        name: "Core Recovery",
        status: "active",
      },
      {
        createdAt: "2026-06-02T10:00:00.000Z",
        id: "project-amber-1",
        name: "Claims Modernisation",
        status: "active",
      },
      {
        createdAt: "2026-06-01T10:00:00.000Z",
        id: "project-green-1",
        name: "Data Enablement",
        status: "active",
      },
    ]);
    projectMocks.getProject.mockImplementation(async (projectId: string) => ({
      createdAt: "2026-06-01T10:00:00.000Z",
      health:
        projectId === "project-green-1"
          ? { reasons: ["No health issues identified"], status: "GREEN" }
          : projectId === "project-amber-1"
            ? { reasons: ["1 high risk open"], status: "AMBER" }
            : { reasons: ["1 critical issue open"], status: "RED" },
      id: projectId,
      members: [],
    }));

    const executiveView = render(<ExecutiveDashboardPage />);

    await waitFor(() => {
      expect(portfolioMocks.getPortfolioSummary).toHaveBeenCalled();
    });

    const greenProjectsWidget = screen.getByText("Green Projects").closest("a");
    expect(greenProjectsWidget).toHaveAttribute(
      "href",
      "/projects?health=GREEN",
    );
    expect(
      within(greenProjectsWidget as HTMLAnchorElement).getByText("1"),
    ).toBeInTheDocument();

    fireEvent.click(greenProjectsWidget as HTMLAnchorElement);
    expect(window.location.pathname + window.location.search).toBe(
      "/projects?health=GREEN",
    );

    executiveView.unmount();

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(projectMocks.getProjects).toHaveBeenCalled();
    });

    const projectRows = screen.getAllByRole("link");
    expect(projectRows).toHaveLength(1);
    expect(projectRows[0]).toHaveAccessibleName("Open Data Enablement");
  });

  it("keeps the Overdue Tasks widget count aligned during executive drilldown navigation", async () => {
    portfolioMocks.getPortfolioSummary.mockResolvedValue({
      totalProjects: 1,
      greenProjects: 1,
      amberProjects: 0,
      redProjects: 0,
      projectsRequiringAttention: [],
      openRisksBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      openIssuesByPriority: { critical: 0, high: 0, medium: 0, low: 0 },
      overdueTasks: {
        total: 2,
        projects: [
          {
            projectId: "project-1",
            projectName: "Core Platform",
            overdueTaskCount: 2,
          },
        ],
      },
      upcomingMilestones: [],
    });

    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const overdueDateOne = new Date(today.getTime() - oneDay)
      .toISOString()
      .slice(0, 10);
    const overdueDateTwo = new Date(today.getTime() - 2 * oneDay)
      .toISOString()
      .slice(0, 10);
    const dueToday = today.toISOString().slice(0, 10);
    const futureDate = new Date(today.getTime() + oneDay)
      .toISOString()
      .slice(0, 10);

    projectMocks.getProjects.mockResolvedValue([
      {
        id: "project-1",
        name: "Core Platform",
        status: "active",
      },
    ]);
    taskMocks.getTasks.mockResolvedValue([
      {
        dueDate: overdueDateOne,
        id: "task-overdue-1",
        priority: "high",
        projectId: "project-1",
        status: "blocked",
        title: "Resolve vendor cutover blocker",
      },
      {
        dueDate: overdueDateTwo,
        id: "task-overdue-2",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Approve recovery plan",
      },
      {
        dueDate: dueToday,
        id: "task-due-today",
        priority: "medium",
        projectId: "project-1",
        status: "todo",
        title: "Prepare steering readout",
      },
      {
        dueDate: futureDate,
        id: "task-future",
        priority: "low",
        projectId: "project-1",
        status: "todo",
        title: "Confirm rollout notes",
      },
    ]);
    taskMocks.getMyTasks.mockResolvedValue([]);

    const executiveView = render(<ExecutiveDashboardPage />);

    await waitFor(() => {
      expect(portfolioMocks.getPortfolioSummary).toHaveBeenCalled();
    });

    const overdueTasksWidget = screen.getByText("Overdue Tasks").closest("a");
    expect(overdueTasksWidget).toHaveAttribute(
      "href",
      "/tasks?scope=all&timing=overdue",
    );
    expect(
      within(overdueTasksWidget as HTMLAnchorElement).getByText("2"),
    ).toBeInTheDocument();

    fireEvent.click(overdueTasksWidget as HTMLAnchorElement);
    expect(window.location.pathname + window.location.search).toBe(
      "/tasks?scope=all&timing=overdue",
    );

    executiveView.unmount();

    render(<TasksPage />);

    await waitFor(() => {
      expect(taskMocks.getTasks).toHaveBeenCalled();
    });

    expect(screen.getByRole("heading", { name: "My Tasks" })).toBeInTheDocument();
    expect(
      screen.getByText("Resolve vendor cutover blocker"),
    ).toBeInTheDocument();
    expect(screen.getByText("Approve recovery plan")).toBeInTheDocument();
    expect(
      screen.queryByText("Prepare steering readout"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Confirm rollout notes")).not.toBeInTheDocument();
    expect(screen.getByLabelText("My Tasks queue")).toBeInTheDocument();
  });
});
