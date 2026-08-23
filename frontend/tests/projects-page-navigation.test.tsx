import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDocumentsPage from "@/app/(app)/projects/[id]/documents/page";
import ProjectDeliveryPage from "@/app/(app)/projects/[id]/delivery/page";
import ProjectExecutionPage from "@/app/(app)/projects/[id]/execution/page";
import DailyReviewPage from "@/app/(app)/daily-review/page";
import TodayPage from "@/app/(app)/today/page";
import ProjectsPage from "@/app/(app)/projects/page";
import ProjectPlanningPage from "@/app/(app)/projects/[id]/planning/page";
import ProjectGovernPage from "@/app/(app)/projects/[id]/govern/page";
import ProjectRaidPage from "@/app/(app)/projects/[id]/raid/page";
import ProjectTasksPage from "@/app/(app)/projects/[id]/tasks/page";
import ProjectWorkspacePage from "@/app/(app)/projects/[id]/page";
import type {
  ApiForecastHistoryItem,
  ApiForecastSnapshotDetail,
  ApiForecastSnapshotTaskSchedule,
} from "@/lib/api/client";

const projectMocks = vi.hoisted(() => {
  function createDefaultProjectDetails(projectId: string) {
    return {
      assumptions: [
        {
          id: "assumption-1",
          projectId,
          status: "active",
          title: "Vendor API remains available",
          type: "assumption",
          validationStatus: "validated",
        },
      ],
      createdAt: "2026-06-01T10:00:00.000Z",
      dependencies: [
        {
          dependsOn: "Security review",
          dueDate: "2026-06-30",
          id: "dependency-1",
          projectId,
          status: "pending",
          title: "IAM approval",
          type: "dependency",
        },
      ],
      description: "Workspace loaded from selected project id.",
      id: projectId,
      issues: [
        {
          id: "issue-1",
          projectId,
          severity: "critical",
          status: "open",
          title: "Integration outage",
          type: "issue",
        },
      ],
      members: [],
      name: "Selected Project Workspace",
      risks: [
        {
          id: "risk-1",
          impact: "high",
          probability: "medium",
          projectId,
          status: "open",
          title: "Supplier onboarding delay",
          type: "risk",
        },
      ],
      status: "active",
      tasks: [
        {
          id: "task-1",
          percentComplete: 42,
          priority: "high",
          projectId,
          status: "in_progress",
          title: "Build workspace navigation",
        },
      ],
    };
  }

  return {
  addProjectMember: vi.fn(),
  captureProjectBaseline: vi.fn(),
  createDefaultProjectDetails,
  createProjectTask: vi.fn(),
  createProjectTaskDependency: vi.fn(),
  deleteProject: vi.fn(),
  deleteProjectTaskDependency: vi.fn(),
  deleteProjectTask: vi.fn(),
  getProject: vi.fn(async (projectId: string) =>
    createDefaultProjectDetails(projectId),
  ),
  getProjects: vi.fn(async () => [
    {
      createdAt: "2026-06-01T10:00:00.000Z",
      id: "project-123",
      name: "Customer Experience Platform Upgrade",
      owner: {
        email: "ava.patel@example.com",
        firstName: "Ava",
        id: "user-1",
        lastName: "Patel",
        status: "active",
      },
      status: "active",
    },
  ]),
  getAssignableUsers: vi.fn(async () => []),
  getProjectBaseline: vi.fn(async (projectId: string, baselineId: string) => ({
    capturedAt: "2026-06-01T10:00:00.000Z",
    capturedById: "user-1",
    id: baselineId,
    isCurrent: true,
    name: "Approved Delivery Baseline",
    projectId,
    status: "approved",
    tasks: [],
    versionNumber: 1,
  })),
  getProjectBaselines: vi.fn(async () => []),
  getProjectMembers: vi.fn(async () => []),
  getProjectTaskDependencies: vi.fn(async () => []),
  removeProjectMember: vi.fn(),
  recordProjectTaskExecutionUpdate: vi.fn(),
  updateProject: vi.fn(),
  updateProjectTask: vi.fn(),
  updateProjectTaskDependency: vi.fn(),
  updateProjectMember: vi.fn(),
};
});

const planningMocks = vi.hoisted(() => ({
  createPlanningDependency: vi.fn(),
  createPlanningTask: vi.fn(),
  deletePlanningDependency: vi.fn(),
  duplicatePlanningWorkPackage: vi.fn(),
  getLatestPlanningSchedule: vi.fn(async () => null),
  getProjectBaseline: vi.fn(),
  getProjectForecastHistory: vi.fn(async () => ({
    hasMore: false,
    items: [],
    nextCursor: null,
  })),
  getProjectForecastOverview: vi.fn(async (projectId: string) => ({
    activeBaseline: null,
    availability: {
      activeBaseline: false,
      currentForecast: false,
      originalBaseline: false,
      previousForecast: false,
    },
    currentForecast: null,
    finishVarianceFromCurrentActiveBaselineDays: null,
    finishVarianceFromPreviousDays: null,
    originalBaseline: null,
    previousForecast: null,
    projectId,
    warnings: [],
    workingOutputState: "not_requested",
  })),
  getProjectForecastSnapshot: vi.fn(),
  getPlanningWorkspace: vi.fn(async (projectId: string) => ({
    criticalPathTaskIds: [],
    dependencies: [],
    project: {
      id: projectId,
      name: "Selected Project Workspace",
      status: "active",
    },
    resourceAllocations: [],
    schedules: [],
    snapshot: {
      criticalPathTaskIds: [],
      id: "snapshot-1",
      projectCompletionPercent: 0,
      projectId,
      versionNumber: 1,
    },
  })),
  updatePlanningTaskSchedule: vi.fn(),
  regeneratePlanningWorkspace: vi.fn(),
  removeDuplicatedPlanningWorkPackage: vi.fn(),
}));

const planningWorkspaceCapture = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn((href: string) => {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }),
}));

const authMocks = vi.hoisted(() => ({
  getAuthMe: vi.fn(async () => ({
    permissions: [
      { id: "permission-project-read", key: "project.read" },
      { id: "permission-project-update", key: "project.update" },
      { id: "permission-task-create", key: "task.create" },
      { id: "permission-task-update", key: "task.update" },
      { id: "permission-task-delete", key: "task.delete" },
      { id: "permission-task-reassign", key: "task.reassign" },
      { id: "permission-team-manage", key: "project.team.manage" },
      { id: "permission-raid-read", key: "raid.read" },
      { id: "permission-raid-update", key: "raid.update" },
    ],
    roles: [{ id: "role-1", name: "PROJECT_MANAGER" }],
    user: {
      email: "project.manager@example.com",
      firstName: "Project",
      id: "user-1",
      lastName: "Manager",
      roleId: "role-1",
      status: "active",
    },
  })),
  storeAuthMe: vi.fn(
    (authMe: {
      permissions: Array<{ key: string }>;
      roles?: Array<{ name: string }>;
    }) => {
      window.localStorage.setItem(
        "pm_platform_permissions",
        JSON.stringify(authMe.permissions.map((permission) => permission.key)),
      );
      window.localStorage.setItem(
        "pm_platform_role_names",
        JSON.stringify((authMe.roles ?? []).map((role) => role.name)),
      );
    },
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className={className}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        window.history.pushState({}, "", href);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/features/auth", () => ({
  getAuthMe: authMocks.getAuthMe,
  getStoredAccessToken: () => "test-token",
  getStoredPermissionKeys: () =>
    JSON.parse(window.localStorage.getItem("pm_platform_permissions") ?? "[]"),
  getStoredRoleNames: () =>
    JSON.parse(window.localStorage.getItem("pm_platform_role_names") ?? "[]"),
  getStoredSessionUser: () => null,
  useStoredAuthSession: () => ({
    permissionKeys: JSON.parse(
      window.localStorage.getItem("pm_platform_permissions") ?? "[]",
    ),
    roleNames: JSON.parse(
      window.localStorage.getItem("pm_platform_role_names") ?? "[]",
    ),
  }),
  hasAnyPermission: (permissionKeys: string[], requiredPermissions: string[]) =>
    requiredPermissions.some((permission) => permissionKeys.includes(permission)),
  hasPermission: (permissionKeys: string[], requiredPermission: string) =>
    permissionKeys.includes(requiredPermission),
  resolveProjectUiCapabilities: ({
    currentUserId,
    members = [],
    permissionKeys = [],
    project,
    roleNames = [],
    task,
  }: {
    currentUserId?: string | null;
    members?: Array<{ role: string; userId: string }>;
    permissionKeys?: string[];
    project?: {
      businessOwnerId?: string | null;
      deliveryLeadId?: string | null;
      executiveSponsorId?: string | null;
      ownerId?: string | null;
    } | null;
    roleNames?: string[];
    task?: { assigneeId?: string | null } | null;
  }) => {
    const canReadProject = permissionKeys.includes("project.read");
    const canUpdateTasks =
      permissionKeys.includes("task.update") ||
      permissionKeys.includes("task.comment") ||
      permissionKeys.includes("task.reassign");
    const isGovernor =
      Boolean(currentUserId) &&
      (project?.ownerId === currentUserId ||
        project?.businessOwnerId === currentUserId ||
        project?.deliveryLeadId === currentUserId ||
        project?.executiveSponsorId === currentUserId ||
        members.some(
          (member) =>
            member.userId === currentUserId &&
            ["owner", "manager"].includes(member.role),
        ));
    const canManageProjectTasks = canUpdateTasks && isGovernor;
    const canUpdateTask =
      canManageProjectTasks ||
      (canUpdateTasks && Boolean(currentUserId) && task?.assigneeId === currentUserId);
    const canExecuteWork =
      canReadProject && permissionKeys.includes("task.update");
    const canAccessStandup =
      roleNames.some((roleName) =>
        [
          "PLATFORM_ADMIN",
          "PORTFOLIO_MANAGER",
          "PROGRAM_MANAGER",
          "PROJECT_MANAGER",
          "SUPER_ADMIN",
        ].includes(roleName),
      ) && canExecuteWork;
    const canManageProject =
      permissionKeys.includes("project.update") && isGovernor;
    return {
      canAccessDailyReview: canAccessStandup,
      canAccessDelivery: canExecuteWork,
      canAccessGovern:
        permissionKeys.includes("project.update") &&
        (permissionKeys.includes("raid.read") ||
          permissionKeys.includes("raid.update") ||
          permissionKeys.includes("raid.create")),
      canAccessPlanning:
        permissionKeys.includes("project.update") && canUpdateTasks,
      canAccessToday: canExecuteWork,
      canApproveDocuments: canManageProject,
      canContributeDocuments: canReadProject,
      canEditDocument: canManageProject,
      canEditExecution: canUpdateTask,
      canEditPlanning:
        canManageProjectTasks && permissionKeys.includes("project.update"),
      canExecuteAssignedTask: canUpdateTask,
      canManageDocuments: canManageProject,
      canManageProjectTasks,
      canManageTeam:
        permissionKeys.includes("project.team.manage") && canManageProject,
      canReassignTask: canUpdateTask && permissionKeys.includes("task.reassign"),
      canUpdateTask,
      canUploadDocuments: canReadProject,
    };
  },
  storeAuthMe: authMocks.storeAuthMe,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({
    id:
      window.location.pathname
        .split("/")
        .filter(Boolean)
        .at(
          window.location.pathname
            .split("/")
            .filter(Boolean)
            .indexOf("projects") + 1,
        ) ?? "",
  }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({
    push: navigationMocks.push,
    replace: (href: string) => {
      window.history.replaceState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  }),
}));

vi.mock("@/features/planning", () => ({
  createPlanningDependency: planningMocks.createPlanningDependency,
  createPlanningTask: planningMocks.createPlanningTask,
  deletePlanningDependency: planningMocks.deletePlanningDependency,
  duplicatePlanningWorkPackage: planningMocks.duplicatePlanningWorkPackage,
  getLatestPlanningSchedule: planningMocks.getLatestPlanningSchedule,
  getPlanningWorkspace: planningMocks.getPlanningWorkspace,
  getProjectBaseline: planningMocks.getProjectBaseline,
  getProjectForecastHistory: planningMocks.getProjectForecastHistory,
  getProjectForecastOverview: planningMocks.getProjectForecastOverview,
  getProjectForecastSnapshot: planningMocks.getProjectForecastSnapshot,
  regeneratePlanningWorkspace: planningMocks.regeneratePlanningWorkspace,
  removeDuplicatedPlanningWorkPackage:
    planningMocks.removeDuplicatedPlanningWorkPackage,
  updatePlanningTaskSchedule: planningMocks.updatePlanningTaskSchedule,
}));

vi.mock("@/components/planning/planning-workspace", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/planning/planning-workspace")
  >("@/components/planning/planning-workspace");
  return {
    PlanningWorkspace: (props: Record<string, unknown>) => {
      planningWorkspaceCapture.current = props;
      return React.createElement(actual.PlanningWorkspace, props as never);
    },
  };
});

vi.mock("@/features/projects", () => ({
  addProjectMember: projectMocks.addProjectMember,
  captureProjectBaseline: projectMocks.captureProjectBaseline,
  createProjectTask: projectMocks.createProjectTask,
  createProjectTaskDependency: projectMocks.createProjectTaskDependency,
  createProject: vi.fn(),
  deleteProject: projectMocks.deleteProject,
  deleteProjectTaskDependency: projectMocks.deleteProjectTaskDependency,
  deleteProjectTask: projectMocks.deleteProjectTask,
  getAssignableUsers: projectMocks.getAssignableUsers,
  getProjectBaseline: projectMocks.getProjectBaseline,
  getProjectBaselines: projectMocks.getProjectBaselines,
  getProjectMembers: projectMocks.getProjectMembers,
  getProject: projectMocks.getProject,
  getProjectTaskDependencies: projectMocks.getProjectTaskDependencies,
  getProjects: projectMocks.getProjects,
  removeProjectMember: projectMocks.removeProjectMember,
  recordProjectTaskExecutionUpdate: projectMocks.recordProjectTaskExecutionUpdate,
  updateProject: projectMocks.updateProject,
  updateProjectTask: projectMocks.updateProjectTask,
  updateProjectTaskDependency: projectMocks.updateProjectTaskDependency,
  updateProjectMember: projectMocks.updateProjectMember,
}));

vi.mock("@/features/tasks", () => ({
  getTaskExecutionUpdates: vi.fn(async () => []),
}));

vi.mock("@/features/users", () => ({
  getAssignableUsers: vi.fn(async () => []),
}));

vi.mock("@/components/projects/project-workspace-tasks", async () => {
  const actual = await vi.importActual<
    typeof import("@/components/projects/project-workspace-tasks")
  >("@/components/projects/project-workspace-tasks");
  return actual;
});

describe("Projects List navigation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigationMocks.push.mockClear();
    projectMocks.getProject.mockReset();
    projectMocks.getProject.mockImplementation(async (projectId: string) =>
      projectMocks.createDefaultProjectDetails(projectId),
    );
    projectMocks.getProjects.mockClear();
    projectMocks.getProjectMembers.mockReset();
    projectMocks.getProjectMembers.mockImplementation(async () => []);
    projectMocks.recordProjectTaskExecutionUpdate.mockReset();
    planningMocks.getPlanningWorkspace.mockClear();
    planningMocks.getLatestPlanningSchedule.mockReset();
    planningMocks.getLatestPlanningSchedule.mockResolvedValue(null);
    planningMocks.getProjectBaseline.mockReset();
    planningMocks.getProjectForecastHistory.mockReset();
    planningMocks.getProjectForecastHistory.mockResolvedValue({
      hasMore: false,
      items: [],
      nextCursor: null,
    });
    planningMocks.getProjectForecastOverview.mockReset();
    planningMocks.getProjectForecastOverview.mockImplementation(
      async (projectId: string) => ({
        activeBaseline: null,
        availability: {
          activeBaseline: false,
          currentForecast: false,
          originalBaseline: false,
          previousForecast: false,
        },
        currentForecast: null,
        finishVarianceFromCurrentActiveBaselineDays: null,
        finishVarianceFromPreviousDays: null,
        originalBaseline: null,
        previousForecast: null,
        projectId,
        warnings: [],
        workingOutputState: "not_requested",
      }),
    );
    planningMocks.getProjectForecastSnapshot.mockReset();
    planningWorkspaceCapture.current = null;
    authMocks.getAuthMe.mockClear();
    authMocks.storeAuthMe.mockClear();
  });

  it("announces project overview loading and error states", async () => {
    window.history.pushState({}, "", "/projects/project-123");
    projectMocks.getProject.mockReturnValueOnce(new Promise(() => {}));

    render(<ProjectWorkspacePage />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading project workspace",
    );

    cleanup();
    projectMocks.getProject.mockRejectedValueOnce(
      new Error("Unable to load project overview"),
    );
    render(<ProjectWorkspacePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load project overview",
    );
  });

  it("navigates to Project Workspace when a project row is clicked", async () => {
    window.history.pushState({}, "", "/projects");

    render(<ProjectsPage />);

    const projectRow = await screen.findByRole("link", {
      name: /Customer Experience Platform Upgrade/i,
    });

    expect(projectRow).toHaveClass("cursor-pointer");

    fireEvent.click(projectRow);

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/projects/project-123",
      );
      expect(window.location.pathname).toBe("/projects/project-123");
    });

    projectMocks.getProject.mockClear();
    cleanup();

    render(<ProjectWorkspacePage />);

    await waitFor(() => {
      expect(projectMocks.getProject).toHaveBeenCalledWith("project-123");
    });
    expect(
      await screen.findByRole("heading", {
        name: /Selected Project Workspace/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Project Health" }),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getByRole("heading", {
          level: 1,
          name: /Selected Project Workspace/,
        })
        .closest("header"),
    ).toHaveClass("shadow-ui-subtle");
    expect(
      screen.getByRole("heading", { name: "Timeline Snapshot" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Executive Overview")).not.toBeInTheDocument();
    expect(screen.getByText("Attention")).toBeInTheDocument();
    expect(screen.getByText("Delivery Summary")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Risks: 1" }),
    ).toHaveAttribute("href", "/projects/project-123/govern");
    expect(
      screen.getByRole("link", { name: "Open Issues: 1" }),
    ).toHaveAttribute("href", "/projects/project-123/govern");
    expect(screen.queryByText("RAID Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Team Summary")).not.toBeInTheDocument();
  });

  it("opens the top-level Daily Review queue for project leadership", async () => {
    window.history.pushState({}, "", "/daily-review");
    authMocks.getAuthMe.mockResolvedValueOnce({
      permissions: [
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-task-update", key: "task.update" },
      ],
      roles: [{ id: "role-project-manager", name: "PROJECT_MANAGER", permissions: [] }],
      user: {
        email: "project.manager@example.com",
        firstName: "Project",
        id: "user-1",
        lastName: "Manager",
        roleId: "role-project-manager",
        status: "active",
      },
    });

    render(<DailyReviewPage />);

    expect(await screen.findByLabelText("Select project")).toHaveValue(
      "project-123",
    );
    expect(await screen.findByRole("button", { name: /Today/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Search execution queue")).toBeInTheDocument();
    expect(screen.getByLabelText("Review progress")).toHaveTextContent("0 / 1");
    expect(
      screen.getByRole("toolbar", { name: /daily review filters/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Build workspace navigation"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search execution queue"), {
      target: { value: "does not exist" },
    });
    expect(
      await screen.findByText("No tasks in this review queue"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search execution queue"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Blocked/i })[0]);
    expect(
      await screen.findByText("No tasks in this review queue"),
    ).toBeInTheDocument();
  });

  it("keeps summary ancestors so child tasks render in the first project queue", async () => {
    window.history.pushState({}, "", "/daily-review");
    projectMocks.getProjects.mockResolvedValueOnce([
      {
        id: "capgemini-project",
        name: "CapGemini",
        status: "active",
      },
    ]);
    projectMocks.getProject.mockResolvedValueOnce({
      id: "capgemini-project",
      name: "CapGemini",
      status: "active",
      members: [],
      tasks: [
        {
          id: "capgemini-summary",
          projectId: "capgemini-project",
          priority: "medium",
          status: "in_progress",
          taskKind: "summary",
          title: "CapGemini delivery",
        },
        {
          id: "capgemini-child",
          parentTaskId: "capgemini-summary",
          projectId: "capgemini-project",
          priority: "high",
          status: "in_progress",
          title: "Configure client integration",
        },
      ],
    });
    authMocks.getAuthMe.mockResolvedValueOnce({
      permissions: [
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-task-update", key: "task.update" },
      ],
      roles: [{ id: "role-project-manager", name: "PROJECT_MANAGER", permissions: [] }],
      user: {
        email: "project.manager@example.com",
        firstName: "Project",
        id: "user-1",
        lastName: "Manager",
        roleId: "role-project-manager",
        status: "active",
      },
    });

    render(<DailyReviewPage />);

    expect(await screen.findByText("Configure client integration")).toBeInTheDocument();
    expect(screen.queryByText("No tasks yet.")).not.toBeInTheDocument();
  });

  it("lets task-authorised project managers edit Today tasks without project creation ownership", async () => {
    window.history.pushState({}, "", "/today");
    authMocks.getAuthMe.mockResolvedValueOnce({
      permissions: [
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-task-update", key: "task.update" },
        { id: "permission-task-reassign", key: "task.reassign" },
      ],
      roles: [{ id: "role-team-member", name: "TEAM_MEMBER", permissions: [] }],
      user: {
        email: "technical.manager@example.com",
        firstName: "Technical",
        id: "user-1",
        lastName: "Manager",
        roleId: "role-team-member",
        status: "active",
      },
    });
    projectMocks.getProjects.mockResolvedValueOnce([
      {
        id: "project-123",
        name: "Customer Experience Platform Upgrade",
        ownerId: "user-creator",
        status: "active",
      },
    ]);
    projectMocks.getProject.mockResolvedValueOnce({
      id: "project-123",
      members: [
        {
          id: "member-manager",
          projectId: "project-123",
          role: "manager",
          userId: "user-1",
        },
      ],
      name: "Customer Experience Platform Upgrade",
      ownerId: "user-creator",
      status: "active",
      tasks: [
        {
          assigneeId: "user-2",
          id: "task-other-assignee",
          percentComplete: 20,
          priority: "high",
          projectId: "project-123",
          status: "todo",
          taskKind: "standard",
          title: "Update integration rollout",
        },
      ],
    });
    const managerMembers = [
      {
        id: "member-manager",
        projectId: "project-123",
        role: "manager",
        userId: "user-1",
      },
    ];
    projectMocks.getProjectMembers
      .mockResolvedValueOnce(managerMembers)
      .mockResolvedValueOnce(managerMembers);

    render(<TodayPage />);

    expect(await screen.findByLabelText("Task scope")).toHaveValue("team");
    expect(
      screen.getByLabelText("Status for Update integration rollout"),
    ).toBeEnabled();
    expect(
      screen.getByLabelText("Priority for Update integration rollout"),
    ).toBeEnabled();
  });

  it("renders Project Workspace tabs with the current tab highlighted", async () => {
    window.history.pushState({}, "", "/projects/project-123");
    window.localStorage.setItem(
      "pm_platform_permissions",
      JSON.stringify([
        "project.read",
        "project.update",
        "task.update",
        "raid.read",
        "raid.update",
      ]),
    );
    window.localStorage.setItem(
      "pm_platform_role_names",
      JSON.stringify(["PROJECT_MANAGER"]),
    );

    render(<ProjectWorkspacePage />);

    expect(
      await screen.findByRole("heading", {
        name: /Selected Project Workspace/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Planning" })).toHaveAttribute(
      "href",
      "/projects/project-123/planning",
    );
    expect(await screen.findByRole("link", { name: "Delivery" })).toHaveAttribute(
      "href",
      "/projects/project-123/delivery",
    );
    expect(screen.getByRole("link", { name: "Govern" })).toHaveAttribute(
      "href",
      "/projects/project-123/govern",
    );
    expect(screen.queryByRole("link", { name: "Today" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tasks" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "RAID" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute(
      "href",
      "/projects/project-123/team",
    );
    expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute(
      "href",
      "/projects/project-123/documents",
    );
    expect(screen.queryByRole("link", { name: "Calendar" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "AI (future)" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Resources" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Attention")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("loads the Planning route inside the Project Workspace", async () => {
    window.history.pushState({}, "", "/projects/project-123/planning");
    window.localStorage.setItem(
      "pm_platform_permissions",
      JSON.stringify([
        "project.read",
        "project.update",
        "task.update",
        "raid.read",
      ]),
    );
    window.localStorage.setItem(
      "pm_platform_role_names",
      JSON.stringify(["PROJECT_MANAGER"]),
    );

    render(<ProjectPlanningPage />);

    await waitFor(() => {
      expect(planningMocks.getPlanningWorkspace).toHaveBeenCalledWith(
        "project-123",
      );
    });
    expect(screen.getByRole("link", { name: "Planning" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      await screen.findByText("Selected Project Workspace planning workspace"),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("heading", {
          level: 1,
          name: /Selected Project Workspace/,
        })
        .closest("header"),
    ).toHaveClass("shadow-ui-subtle");
  });

  it("loads authoritative Forecast and Active Baseline references for Planning", async () => {
    window.history.pushState({}, "", "/projects/project-123/planning");
    const forecastOverview = {
      activeBaseline: {
        capturedAt: "2026-06-01T09:00:00.000Z",
        capturedBy: null,
        id: "baseline-2",
        isCurrent: true,
        milestoneCount: 0,
        name: "Approved plan",
        projectFinishDate: "2026-07-20",
        projectId: "project-123",
        projectStartDate: "2026-07-01",
        status: "approved",
        taskCount: 1,
        unscheduledExecutableTaskCount: 0,
        versionNumber: 2,
      },
      availability: {
        activeBaseline: true,
        currentForecast: true,
        originalBaseline: true,
        previousForecast: false,
      },
      currentForecast: {
        calculatedAt: "2026-07-02T09:00:00.000Z",
        calculationStatus: "calculated" as const,
        criticalTaskCount: 0,
        generatedBy: null,
        isCurrent: true,
        milestoneCount: 0,
        projectFinishDate: "2026-07-21",
        projectId: "project-123",
        projectStartDate: "2026-07-01",
        scheduleAnchorDate: "2026-07-01",
        scheduleVersion: 2,
        snapshotId: "forecast-2",
        taskCount: 1,
        unscheduledExecutableTaskCount: 0,
      },
      finishVarianceFromCurrentActiveBaselineDays: 1,
      finishVarianceFromPreviousDays: null,
      originalBaseline: null,
      previousForecast: null,
      projectId: "project-123",
      warnings: [],
      workingOutputState: "not_requested" as const,
    };
    const latestSchedule = {
      calculationStatus: "calculated" as const,
      id: "forecast-2",
      projectId: "project-123",
      scheduleVersion: 2,
      taskSchedules: [],
    };
    const baseline = {
      capturedAt: "2026-06-01T09:00:00.000Z",
      capturedById: "user-1",
      id: "baseline-2",
      isCurrent: true,
      name: "Approved plan",
      projectId: "project-123",
      status: "approved",
      tasks: [],
      versionNumber: 2,
    };
    planningMocks.getProjectForecastOverview.mockResolvedValue(
      forecastOverview,
    );
    planningMocks.getLatestPlanningSchedule.mockResolvedValue(latestSchedule);
    planningMocks.getProjectBaseline.mockResolvedValue(baseline);

    render(<ProjectPlanningPage />);

    await waitFor(() => {
      expect(planningWorkspaceCapture.current?.currentForecast).toEqual(
        latestSchedule,
      );
      expect(planningWorkspaceCapture.current?.activeBaseline).toEqual(
        baseline,
      );
    });
    expect(planningMocks.getLatestPlanningSchedule).toHaveBeenCalledWith(
      "project-123",
    );
    expect(planningMocks.getProjectBaseline).toHaveBeenCalledWith(
      "project-123",
      "baseline-2",
    );
  });

  it("loads one selected historical Forecast without replacing live Planning state", async () => {
    window.history.pushState({}, "", "/projects/project-123/planning");
    const currentForecast = {
      calculationStatus: "calculated" as const,
      id: "forecast-current-3",
      projectId: "project-123",
      scheduleVersion: 3,
      taskSchedules: [],
    };
    const currentForecastSummary = {
      ...forecastSnapshotDetail({
        scheduleVersion: 3,
        snapshotId: "forecast-current-3",
        taskSchedules: [],
      }).snapshot,
      isCurrent: true,
    };
    const historicalSummary = forecastHistoryItem({
      scheduleVersion: 2,
      snapshotId: "historical-snapshot-2",
    });
    const historicalSnapshot = forecastSnapshotDetail({
      scheduleVersion: 2,
      snapshotId: "historical-snapshot-2",
      taskSchedules: [
        {
          durationDays: 9,
          isCritical: true,
          milestoneCategory: null,
          parentTaskId: null,
          scheduledEndDate: "2026-08-12",
          scheduledStartDate: "2026-08-03",
          sequenceNumber: 1,
          taskId: null,
          taskKind: "standard" as const,
          taskTitle: "Captured deleted task",
        },
      ],
    });
    const deferred = createDeferred<typeof historicalSnapshot>();
    planningMocks.getLatestPlanningSchedule.mockResolvedValue(currentForecast);
    planningMocks.getProjectForecastOverview.mockResolvedValue({
      activeBaseline: null,
      availability: {
        activeBaseline: false,
        currentForecast: true,
        originalBaseline: false,
        previousForecast: false,
      },
      currentForecast: currentForecastSummary,
      finishVarianceFromCurrentActiveBaselineDays: null,
      finishVarianceFromPreviousDays: null,
      originalBaseline: null,
      previousForecast: null,
      projectId: "project-123",
      warnings: [],
      workingOutputState: "not_requested",
    });
    planningMocks.getProjectForecastHistory.mockResolvedValue({
      hasMore: false,
      items: [historicalSummary],
      nextCursor: null,
    });
    planningMocks.getProjectForecastSnapshot.mockReturnValue(deferred.promise);

    render(<ProjectPlanningPage />);
    await waitFor(() => {
      expect(planningWorkspaceCapture.current?.currentForecast).toEqual(
        currentForecast,
      );
    });
    const workingSchedule = planningWorkspaceCapture.current?.workspace;

    fireEvent.click(screen.getByRole("button", { name: "Forecast History" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "View Schedule v2" }),
    );

    expect(planningMocks.getProjectForecastSnapshot).toHaveBeenCalledWith(
      "project-123",
      "historical-snapshot-2",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await screen.findByText("Loading Schedule v2 historical Forecast"),
    ).toBeInTheDocument();
    expect(planningWorkspaceCapture.current?.workspace).toBe(workingSchedule);
    expect(planningWorkspaceCapture.current?.currentForecast).toEqual(
      currentForecast,
    );
    expect(
      planningWorkspaceCapture.current?.selectedHistoricalForecast,
    ).toBeNull();

    await act(async () => deferred.resolve(historicalSnapshot));

    await waitFor(() => {
      expect(
        planningWorkspaceCapture.current?.selectedHistoricalForecast,
      ).toEqual(historicalSnapshot);
    });
    const selected = planningWorkspaceCapture.current
      ?.selectedHistoricalForecast as typeof historicalSnapshot;
    expect(selected.snapshot.snapshotId).toBe("historical-snapshot-2");
    expect(selected.snapshot.scheduleVersion).toBe(2);
    expect(selected.taskSchedules[0]?.taskId).toBeNull();
    expect(planningWorkspaceCapture.current?.currentForecast).toEqual(
      currentForecast,
    );
    expect(planningWorkspaceCapture.current?.workspace).toBe(workingSchedule);
    expect(planningMocks.getPlanningWorkspace).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId("historical-reference-layer")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Tracking legend")).toHaveTextContent(
      "Historical Forecast v2",
    );
    fireEvent.click(screen.getByRole("button", { name: /^Tracking/ }));
    const historicalToggle = screen.getByRole("menuitemcheckbox", {
      name: "Historical Forecast version 2",
    });
    expect(historicalToggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(historicalToggle);
    expect(screen.queryByTestId("historical-reference-layer")).toBeNull();
    fireEvent.click(historicalToggle);
    expect(screen.getByTestId("historical-reference-layer")).toBeInTheDocument();
    expect(planningMocks.getProjectForecastSnapshot).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Back to Current Forecast" }),
    );
    await waitFor(() => {
      expect(
        planningWorkspaceCapture.current?.selectedHistoricalForecast,
      ).toBeNull();
    });
    expect(screen.queryByTestId("historical-reference-layer")).toBeNull();
    expect(screen.getByLabelText("Tracking legend")).not.toHaveTextContent(
      "Historical Forecast",
    );
    expect(
      screen.queryByRole("menuitemcheckbox", {
        name: "Historical Forecast version 2",
      }),
    ).toBeNull();
  });

  it("retries a failed historical Forecast load and accepts an empty snapshot", async () => {
    window.history.pushState({}, "", "/projects/project-123/planning");
    const historicalSummary = forecastHistoryItem({
      scheduleVersion: 1,
      snapshotId: "historical-snapshot-1",
    });
    const emptySnapshot = forecastSnapshotDetail({
      scheduleVersion: 1,
      snapshotId: "historical-snapshot-1",
      taskSchedules: [],
    });
    planningMocks.getProjectForecastHistory.mockResolvedValue({
      hasMore: false,
      items: [historicalSummary],
      nextCursor: null,
    });
    planningMocks.getProjectForecastSnapshot
      .mockRejectedValueOnce(new Error("database detail must stay hidden"))
      .mockResolvedValueOnce(emptySnapshot);

    render(<ProjectPlanningPage />);
    await screen.findByText("Selected Project Workspace planning workspace");
    fireEvent.click(screen.getByRole("button", { name: "Forecast History" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "View Schedule v1" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Historical Forecast could not be loaded. Try again.",
    );
    expect(alert).not.toHaveTextContent("database");
    expect(
      planningWorkspaceCapture.current?.selectedHistoricalForecast,
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Retry historical Forecast" }),
    );
    await waitFor(() => {
      expect(
        planningWorkspaceCapture.current?.selectedHistoricalForecast,
      ).toEqual(emptySnapshot);
    });
    expect(emptySnapshot.taskSchedules).toEqual([]);
    expect(planningMocks.getProjectForecastSnapshot).toHaveBeenNthCalledWith(
      2,
      "project-123",
      "historical-snapshot-1",
    );
    expect(planningMocks.getPlanningWorkspace).toHaveBeenCalledTimes(1);
  });

  it("reloads one coherent workspace after a Planning task mutation", async () => {
    window.history.pushState({}, "", "/projects/project-123/planning");
    const initialWorkspace = await planningMocks.getPlanningWorkspace(
      "project-123",
    );
    planningMocks.getPlanningWorkspace.mockClear();
    const scheduleDefaults = {
      durationDays: 1,
      isCritical: false,
      percentComplete: 0,
      projectId: "project-123",
      taskKind: "standard",
      taskType: "task",
    };
    const coherentWorkspace = {
      ...initialWorkspace,
      schedules: [
        {
          ...scheduleDefaults,
          id: "task-1",
          snapshotId: "working-2",
          taskId: "task-1",
          taskTitle: "Task one",
        },
        {
          ...scheduleDefaults,
          id: "task-2",
          snapshotId: "working-2",
          taskId: "task-2",
          taskTitle: "Task two",
        },
      ],
      snapshot: {
        ...initialWorkspace.snapshot,
        id: "working-2",
        isOfficial: false,
        versionNumber: 0,
      },
    };
    planningMocks.getPlanningWorkspace
      .mockResolvedValueOnce(initialWorkspace)
      .mockResolvedValueOnce(coherentWorkspace);
    planningMocks.updatePlanningTaskSchedule.mockResolvedValue({
      id: "task-1",
      snapshotId: "discarded-mutation-result",
      taskId: "task-1",
    });

    render(<ProjectPlanningPage />);
    await waitFor(() => expect(planningWorkspaceCapture.current).not.toBeNull());
    const update = planningWorkspaceCapture.current?.onUpdateSchedule as (
      taskId: string,
      input: Record<string, unknown>,
    ) => Promise<unknown>;
    await act(async () => {
      await update("task-1", { durationDays: 3 });
    });

    await waitFor(() => {
      const workspace = planningWorkspaceCapture.current?.workspace as {
        schedules: Array<{ snapshotId: string }>;
        snapshot: { id: string };
      };
      expect(workspace.snapshot.id).toBe("working-2");
      expect(new Set(workspace.schedules.map((row) => row.snapshotId))).toEqual(
        new Set(["working-2"]),
      );
    });
    expect(planningMocks.getPlanningWorkspace).toHaveBeenCalledTimes(2);
  });

  it("reloads complete workspaces after task creation and dependency mutation", async () => {
    window.history.pushState({}, "", "/projects/project-123/planning");
    const initialWorkspace = await planningMocks.getPlanningWorkspace(
      "project-123",
    );
    planningMocks.getPlanningWorkspace.mockClear();
    const schedule = (taskId: string, snapshotId: string) => ({
      durationDays: 1,
      id: taskId,
      isCritical: false,
      percentComplete: 0,
      projectId: "project-123",
      snapshotId,
      taskId,
      taskKind: "standard",
      taskTitle: taskId,
      taskType: "task",
    });
    const afterTask = {
      ...initialWorkspace,
      schedules: [schedule("task-1", "working-task")],
      snapshot: {
        ...initialWorkspace.snapshot,
        id: "working-task",
        isOfficial: false,
        versionNumber: 0,
      },
    };
    const afterDependency = {
      ...afterTask,
      schedules: [
        schedule("task-1", "working-dependency"),
        schedule("task-2", "working-dependency"),
      ],
      snapshot: { ...afterTask.snapshot, id: "working-dependency" },
    };
    planningMocks.getPlanningWorkspace
      .mockResolvedValueOnce(initialWorkspace)
      .mockResolvedValueOnce(afterTask)
      .mockResolvedValueOnce(afterDependency);
    planningMocks.createPlanningTask.mockResolvedValue(
      schedule("task-1", "discarded-row"),
    );
    planningMocks.createPlanningDependency.mockResolvedValue({ id: "dep-1" });

    render(<ProjectPlanningPage />);
    await waitFor(() => expect(planningWorkspaceCapture.current).not.toBeNull());
    await act(async () => {
      const createTask = planningWorkspaceCapture.current?.onCreateTask as (
        input: Record<string, unknown>,
      ) => Promise<unknown>;
      await createTask({ title: "Task one" });
    });
    expect(
      (planningWorkspaceCapture.current?.workspace as { snapshot: { id: string } })
        .snapshot.id,
    ).toBe("working-task");

    await act(async () => {
      const createDependency = planningWorkspaceCapture.current
        ?.onCreateDependency as (
        input: Record<string, unknown>,
      ) => Promise<void>;
      await createDependency({
        dependencyType: "FS",
        predecessorTaskId: "task-1",
        successorTaskId: "task-2",
      });
    });
    const workspace = planningWorkspaceCapture.current?.workspace as {
      schedules: Array<{ snapshotId: string }>;
      snapshot: { id: string };
    };
    expect(workspace.snapshot.id).toBe("working-dependency");
    expect(new Set(workspace.schedules.map((row) => row.snapshotId))).toEqual(
      new Set(["working-dependency"]),
    );
    expect(planningMocks.getPlanningWorkspace).toHaveBeenCalledTimes(3);
  });

  it("redirects legacy Tasks route into Delivery", async () => {
    window.history.pushState({}, "", "/projects/project-123/tasks");

    render(<ProjectTasksPage />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/projects/project-123/delivery");
    });
  });

  it("redirects legacy Execution route into Delivery", async () => {
    window.history.pushState({}, "", "/projects/project-123/execution");

    render(<ProjectExecutionPage />);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/projects/project-123/delivery");
    });
  });

  it("loads the Delivery workspace for project leadership", async () => {
    vi.setSystemTime(new Date("2026-08-01T09:00:00.000Z"));
    window.history.pushState({}, "", "/projects/project-123/delivery");
    window.localStorage.setItem(
      "pm_platform_permissions",
      JSON.stringify([
        "project.read",
        "project.update",
        "task.update",
        "task.reassign",
        "raid.read",
      ]),
    );
    window.localStorage.setItem(
      "pm_platform_role_names",
      JSON.stringify(["PROJECT_MANAGER"]),
    );
    authMocks.getAuthMe.mockResolvedValueOnce({
      permissions: [
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-project-update", key: "project.update" },
        { id: "permission-task-update", key: "task.update" },
        { id: "permission-task-reassign", key: "task.reassign" },
        { id: "permission-raid-read", key: "raid.read" },
      ],
      roles: [{ id: "role-project-manager", name: "PROJECT_MANAGER" }],
      user: {
        email: "project.manager@example.com",
        firstName: "Project",
        id: "user-1",
        lastName: "Manager",
        roleId: "role-project-manager",
        status: "active",
      },
    });
    projectMocks.getProject.mockResolvedValueOnce({
      id: "project-123",
      members: [
        {
          id: "member-1",
          projectId: "project-123",
          role: "manager",
          user: {
            email: "project.manager@example.com",
            firstName: "Project",
            id: "user-1",
            lastName: "Manager",
            status: "active",
          },
          userId: "user-1",
        },
      ],
      name: "Selected Project Workspace",
      status: "active",
      tasks: [
        {
          assigneeId: "user-1",
          dueDate: "2026-08-01",
          id: "task-today",
          latestExecutionUpdate: {
            id: "update-1",
            percentComplete: 45,
            priority: "high",
            projectId: "project-123",
            status: "in_progress",
            taskId: "task-today",
            updatedOn: "2026-08-01T08:15:00.000Z",
          },
          percentComplete: 45,
          priority: "high",
          projectId: "project-123",
          status: "in_progress",
          title: "Prepare standup notes",
        },
        {
          assigneeId: "user-2",
          dueDate: "2026-07-31",
          id: "task-blocked",
          percentComplete: 20,
          priority: "critical",
          projectId: "project-123",
          status: "blocked",
          title: "Resolve vendor blocker",
        },
        {
          id: "summary-1",
          priority: "medium",
          projectId: "project-123",
          status: "todo",
          taskKind: "summary",
          title: "Execution summary",
        },
      ],
    });

    render(<ProjectDeliveryPage />);

    expect(
      await screen.findByRole("heading", {
        name: /Selected Project Workspace/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Delivery" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      await screen.findByRole("group", { name: "Delivery toolbar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Delivery views" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("columnheader", { name: "Owner" })).toBeInTheDocument();
    expect(
      screen.queryByTestId("execution-kanban-board"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Board" }));

    expect(await screen.findByTestId("execution-kanban-board")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Owner" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "List" }));

    expect(await screen.findByRole("columnheader", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByText("Prepare standup notes")).toBeInTheDocument();
    expect(screen.getAllByText("Resolve vendor blocker").length).toBeGreaterThan(0);

    const deliveryToolbar = screen.getByRole("group", {
      name: "Delivery toolbar",
    });
    const statusFilter = within(deliveryToolbar).getByLabelText("Status");
    fireEvent.change(statusFilter, { target: { value: "blocked" } });

    expect(screen.queryByText("Prepare standup notes")).not.toBeInTheDocument();
    expect(screen.getAllByText("Resolve vendor blocker").length).toBeGreaterThan(0);
  });

  it("keeps completed tasks visible in the default Delivery Board Done column", async () => {
    window.history.pushState({}, "", "/projects/project-123/delivery?view=board");
    window.localStorage.setItem(
      "pm_platform_permissions",
      JSON.stringify([
        "project.read",
        "project.update",
        "task.update",
        "task.reassign",
        "raid.read",
      ]),
    );
    window.localStorage.setItem(
      "pm_platform_role_names",
      JSON.stringify(["PROJECT_MANAGER"]),
    );
    authMocks.getAuthMe.mockResolvedValueOnce({
      permissions: [
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-project-update", key: "project.update" },
        { id: "permission-task-update", key: "task.update" },
        { id: "permission-task-reassign", key: "task.reassign" },
        { id: "permission-raid-read", key: "raid.read" },
      ],
      roles: [{ id: "role-project-manager", name: "PROJECT_MANAGER" }],
      user: {
        email: "project.manager@example.com",
        firstName: "Project",
        id: "user-1",
        lastName: "Manager",
        roleId: "role-project-manager",
        status: "active",
      },
    });
    projectMocks.getProject.mockResolvedValueOnce({
      id: "project-123",
      members: [
        {
          id: "member-1",
          projectId: "project-123",
          role: "manager",
          user: {
            email: "project.manager@example.com",
            firstName: "Project",
            id: "user-1",
            lastName: "Manager",
            status: "active",
          },
          userId: "user-1",
        },
      ],
      name: "Selected Project Workspace",
      status: "active",
      tasks: [
        {
          assigneeId: "user-1",
          id: "task-active",
          percentComplete: 40,
          priority: "high",
          projectId: "project-123",
          status: "todo",
          title: "Still open delivery task",
        },
        {
          assigneeId: "user-1",
          id: "task-done",
          percentComplete: 100,
          priority: "medium",
          projectId: "project-123",
          status: "done",
          title: "Completed delivery task",
        },
      ],
    });

    render(<ProjectDeliveryPage />);

    expect(await screen.findByTestId("execution-kanban-board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Board" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const doneColumn = screen.getByRole("region", { name: "Done column" });
    expect(within(doneColumn).getByText("Completed delivery task")).toBeInTheDocument();
    expect(within(doneColumn).getByText("1")).toBeInTheDocument();

    const deliveryToolbar = screen.getByRole("group", {
      name: "Delivery toolbar",
    });
    const statusFilter = within(deliveryToolbar).getByLabelText("Status");
    fireEvent.change(statusFilter, { target: { value: "active" } });
    expect(
      within(screen.getByRole("region", { name: "Done column" })).queryByText(
        "Completed delivery task",
      ),
    ).not.toBeInTheDocument();

    fireEvent.change(statusFilter, { target: { value: "completed" } });
    expect(
      within(screen.getByRole("region", { name: "Done column" })).getByText(
        "Completed delivery task",
      ),
    ).toBeInTheDocument();
  });

  it("keeps summary ancestors so Delivery List can render nested active tasks", async () => {
    const projectId = "project-nested-delivery";
    window.history.pushState({}, "", `/projects/${projectId}/delivery`);
    window.localStorage.setItem(
      "pm_platform_permissions",
      JSON.stringify([
        "project.read",
        "project.update",
        "task.update",
        "task.reassign",
        "raid.read",
      ]),
    );
    window.localStorage.setItem(
      "pm_platform_role_names",
      JSON.stringify(["PROJECT_MANAGER"]),
    );
    authMocks.getAuthMe.mockResolvedValueOnce({
      permissions: [
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-project-update", key: "project.update" },
        { id: "permission-task-update", key: "task.update" },
        { id: "permission-task-reassign", key: "task.reassign" },
        { id: "permission-raid-read", key: "raid.read" },
      ],
      roles: [{ id: "role-project-manager", name: "PROJECT_MANAGER" }],
      user: {
        email: "project.manager@example.com",
        firstName: "Project",
        id: "user-1",
        lastName: "Manager",
        roleId: "role-project-manager",
        status: "active",
      },
    });
    const managerMembers = [
      {
        id: "member-1",
        projectId,
        role: "manager",
        user: {
          email: "project.manager@example.com",
          firstName: "Project",
          id: "user-1",
          lastName: "Manager",
          status: "active",
        },
        userId: "user-1",
      },
    ];
    projectMocks.getProjectMembers.mockResolvedValue(managerMembers);
    projectMocks.getProject.mockResolvedValue({
      id: projectId,
      members: managerMembers,
      name: "Selected Project Workspace",
      status: "active",
      tasks: [
        {
          id: "summary-package",
          priority: "medium",
          projectId,
          status: "in_progress",
          taskKind: "summary",
          title: "Delivery package",
        },
        {
          assigneeId: "user-1",
          id: "nested-active",
          parentTaskId: "summary-package",
          percentComplete: 10,
          priority: "high",
          projectId,
          status: "in_progress",
          taskKind: "standard",
          title: "Nested active delivery task",
        },
        {
          assigneeId: "user-2",
          id: "nested-done",
          parentTaskId: "summary-package",
          percentComplete: 100,
          priority: "medium",
          projectId,
          status: "done",
          taskKind: "standard",
          title: "Nested completed delivery task",
        },
      ],
    });

    render(<ProjectDeliveryPage />);

    expect(
      await screen.findByRole("group", { name: "Delivery toolbar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const deliveryToolbar = screen.getByRole("group", {
      name: "Delivery toolbar",
    });
    const statusFilter = within(deliveryToolbar).getByLabelText("Status");
    expect(statusFilter).toHaveValue("all");
    expect(await screen.findByText("Delivery package")).toBeInTheDocument();
    const expandPackage = await screen.findByRole("button", {
      name: /Delivery package/,
    });
    if (expandPackage?.getAttribute("aria-label")?.startsWith("Expand")) {
      fireEvent.click(expandPackage);
    }
    expect(
      await screen.findByRole("button", { name: "Collapse Delivery package" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Nested active delivery task"),
    ).toBeInTheDocument();
    expect(screen.getByText("Nested completed delivery task")).toBeInTheDocument();
    expect(screen.queryByText("No tasks yet.")).not.toBeInTheDocument();

    fireEvent.change(statusFilter, { target: { value: "active" } });
    expect(
      screen.getByLabelText("Active delivery filters"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Active delivery filters")).getByText(
        "Active",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Nested active delivery task")).toBeInTheDocument();
    expect(
      screen.queryByText("Nested completed delivery task"),
    ).not.toBeInTheDocument();
  });

  it("exposes Delivery to Team Members while hiding Planning and Govern", async () => {
    window.history.pushState({}, "", "/projects/project-123/delivery");
    window.localStorage.setItem(
      "pm_platform_permissions",
      JSON.stringify(["project.read", "task.update"]),
    );
    window.localStorage.setItem(
      "pm_platform_role_names",
      JSON.stringify(["TEAM_MEMBER"]),
    );
    authMocks.getAuthMe.mockResolvedValueOnce({
      permissions: [
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-task-update", key: "task.update" },
      ],
      roles: [{ id: "role-team-member", name: "TEAM_MEMBER" }],
      user: {
        email: "team.member@example.com",
        firstName: "Team",
        id: "user-2",
        lastName: "Member",
        roleId: "role-team-member",
        status: "active",
      },
    });
    projectMocks.getProject.mockResolvedValueOnce({
      id: "project-123",
      members: [
        {
          id: "member-2",
          projectId: "project-123",
          role: "contributor",
          user: {
            email: "team.member@example.com",
            firstName: "Team",
            id: "user-2",
            lastName: "Member",
            status: "active",
          },
          userId: "user-2",
        },
      ],
      name: "Selected Project Workspace",
      status: "active",
      tasks: [
        {
          assigneeId: "user-2",
          id: "task-mine",
          percentComplete: 10,
          priority: "medium",
          projectId: "project-123",
          status: "todo",
          title: "Assigned contributor task",
        },
      ],
    });

    render(<ProjectDeliveryPage />);

    expect(
      await screen.findByRole("group", { name: "Delivery toolbar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Delivery" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("link", { name: "Planning" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Govern" })).not.toBeInTheDocument();
    expect(screen.getByText("Assigned contributor task")).toBeInTheDocument();
  });

  it("loads the Govern workspace and redirects legacy RAID", async () => {
    window.history.pushState({}, "", "/projects/project-123/govern");
    window.localStorage.setItem(
      "pm_platform_permissions",
      JSON.stringify([
        "project.read",
        "project.update",
        "task.update",
        "raid.read",
        "raid.update",
      ]),
    );
    window.localStorage.setItem(
      "pm_platform_role_names",
      JSON.stringify(["PROJECT_MANAGER"]),
    );

    render(<ProjectGovernPage />);

    expect(
      await screen.findByText("Supplier onboarding delay"),
    ).toBeInTheDocument();
    expect(screen.getByText("Integration outage")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Govern" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    cleanup();
    window.history.pushState({}, "", "/projects/project-123/raid");
    render(<ProjectRaidPage />);
    await waitFor(() => {
      expect(window.location.pathname).toBe("/projects/project-123/govern");
    });
  });

  it("loads the project Documents route", async () => {
    window.history.pushState({}, "", "/projects/project-123/documents");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        let responseBody: unknown = [
          {
            approvalStatus: "APPROVED",
            category: "Project Management",
            categoryId: "category-1",
            documentType: "Project Charter",
            documentTypeId: "type-1",
            externalUrl: "https://example.com/delivery-plan",
            id: "document-1",
            linkStatus: "UNKNOWN",
            owner: null,
            projectId: "project-123",
            reviewStatus: "NEVER_REVIEWED",
            storageProvider: "SHAREPOINT",
            storageProviderLabel: "SharePoint",
            title: "Delivery Plan",
          },
        ];
        if (url.endsWith("/documents/storage-providers")) {
          responseBody = [
            { label: "SharePoint", value: "SHAREPOINT" },
            { label: "Other", value: "OTHER" },
          ];
        }
        if (url.endsWith("/documents/document-types")) {
          responseBody = [{ id: "type-1", name: "Project Charter" }];
        }
        if (url.endsWith("/documents/categories")) {
          responseBody = [{ id: "category-1", name: "Project Management" }];
        }
        if (url.endsWith("/users/assignable")) {
          responseBody = [];
        }
        if (url.endsWith("/documents/summary")) {
          responseBody = {
            approved: 1,
            byCategory: { "Project Management": 1 },
            byStorageProvider: { SharePoint: 1 },
            draft: 0,
            overdueReviews: 0,
            totalDocuments: 1,
            underReview: 0,
          };
        }

        return Promise.resolve({
          headers: { get: vi.fn(() => null) },
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(JSON.stringify(responseBody)),
        });
      }),
    );

    render(<ProjectDocumentsPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Documents",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Delivery Plan in a new tab" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documents" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("navigates to Project Workspace when the Open button is clicked", async () => {
    window.history.pushState({}, "", "/projects");

    render(<ProjectsPage />);

    const openButton = await screen.findByRole("button", { name: /open/i });
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/projects/project-123",
      );
      expect(window.location.pathname).toBe("/projects/project-123");
    });
  });
});

function forecastHistoryItem({
  scheduleVersion,
  snapshotId,
}: {
  scheduleVersion: number;
  snapshotId: string;
}): ApiForecastHistoryItem {
  return {
    calculatedAt: "2026-08-22T10:00:00.000Z",
    criticalTaskCount: 1,
    finishVarianceFromCurrentActiveBaselineDays: 2,
    finishVarianceFromPreviousDays: 1,
    generatedBy: { id: "user-1", name: "Ram Datla" },
    isCurrent: false,
    milestoneCount: 0,
    projectFinishDate: "2026-08-12",
    projectStartDate: "2026-08-03",
    scheduleVersion,
    snapshotId,
    taskCount: 1,
    unscheduledExecutableTaskCount: 0,
  };
}

function forecastSnapshotDetail({
  scheduleVersion,
  snapshotId,
  taskSchedules,
}: {
  scheduleVersion: number;
  snapshotId: string;
  taskSchedules: ApiForecastSnapshotTaskSchedule[];
}): ApiForecastSnapshotDetail {
  return {
    snapshot: {
      calculatedAt: "2026-08-22T10:00:00.000Z",
      calculationStatus: "calculated",
      criticalTaskCount: 1,
      generatedBy: { id: "user-1", name: "Ram Datla" },
      isCurrent: false,
      milestoneCount: 0,
      projectFinishDate: "2026-08-12",
      projectId: "project-123",
      projectStartDate: "2026-08-03",
      scheduleAnchorDate: "2026-08-03",
      scheduleVersion,
      snapshotId,
      taskCount: taskSchedules.length,
      unscheduledExecutableTaskCount: 0,
    },
    taskSchedules,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
