import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectDocumentsPage from "@/app/(app)/projects/[id]/documents/page";
import ProjectsPage from "@/app/(app)/projects/page";
import ProjectPlanningPage from "@/app/(app)/projects/[id]/planning/page";
import ProjectRaidPage from "@/app/(app)/projects/[id]/raid/page";
import ProjectTasksPage from "@/app/(app)/projects/[id]/tasks/page";
import ProjectWorkspacePage from "@/app/(app)/projects/[id]/page";

const projectMocks = vi.hoisted(() => ({
  addProjectMember: vi.fn(),
  captureProjectBaseline: vi.fn(),
  createProjectTask: vi.fn(),
  createProjectTaskDependency: vi.fn(),
  deleteProject: vi.fn(),
  deleteProjectTaskDependency: vi.fn(),
  deleteProjectTask: vi.fn(),
  getProject: vi.fn(async (projectId: string) => ({
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
  })),
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
  getProjectTaskDependencies: vi.fn(async () => []),
  removeProjectMember: vi.fn(),
  updateProject: vi.fn(),
  updateProjectTask: vi.fn(),
  updateProjectTaskDependency: vi.fn(),
  updateProjectMember: vi.fn(),
}));

const planningMocks = vi.hoisted(() => ({
  createPlanningDependency: vi.fn(),
  createPlanningTask: vi.fn(),
  deletePlanningDependency: vi.fn(),
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
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn((href: string) => {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }),
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
  getAuthMe: vi.fn(async () => ({
    permissions: [
      { id: "permission-task-create", key: "task.create" },
      { id: "permission-task-update", key: "task.update" },
      { id: "permission-task-delete", key: "task.delete" },
      { id: "permission-task-reassign", key: "task.reassign" },
      { id: "permission-team-manage", key: "project.team.manage" },
    ],
    roles: [],
    user: {
      email: "project.manager@example.com",
      firstName: "Project",
      id: "user-1",
      lastName: "Manager",
      roleId: "role-1",
      status: "active",
    },
  })),
  getStoredAccessToken: () => "test-token",
  getStoredPermissionKeys: () => [],
  getStoredSessionUser: () => null,
  hasPermission: (permissionKeys: string[], requiredPermission: string) =>
    permissionKeys.includes(requiredPermission),
  storeAuthMe: vi.fn(),
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
  getPlanningWorkspace: planningMocks.getPlanningWorkspace,
  updatePlanningTaskSchedule: planningMocks.updatePlanningTaskSchedule,
}));

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
  getProject: projectMocks.getProject,
  getProjectTaskDependencies: projectMocks.getProjectTaskDependencies,
  getProjects: projectMocks.getProjects,
  removeProjectMember: projectMocks.removeProjectMember,
  updateProject: projectMocks.updateProject,
  updateProjectTask: projectMocks.updateProjectTask,
  updateProjectTaskDependency: projectMocks.updateProjectTaskDependency,
  updateProjectMember: projectMocks.updateProjectMember,
}));

vi.mock("@/features/users", () => ({
  getAssignableUsers: vi.fn(async () => []),
}));

describe("Projects List navigation", () => {
  beforeEach(() => {
    navigationMocks.push.mockClear();
    projectMocks.getProject.mockClear();
    projectMocks.getProjects.mockClear();
    planningMocks.getPlanningWorkspace.mockClear();
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
      screen.getByRole("heading", { name: "Project Health" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("heading", {
          level: 1,
          name: "Selected Project Workspace",
        })
        .closest("header"),
    ).toHaveClass("shadow-ui-subtle");
    expect(
      screen.getByRole("heading", { name: "Timeline Snapshot" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Executive Overview")).not.toBeInTheDocument();
    expect(
      screen.getAllByText("Supplier onboarding delay").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Open Risks: 1" }),
    ).toHaveAttribute("href", "/projects/project-123/raid");
    expect(
      screen.getByRole("link", { name: "Open Issues: 1" }),
    ).toHaveAttribute("href", "/projects/project-123/raid");
    expect(screen.queryByText("RAID Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Team Summary")).not.toBeInTheDocument();
  });

  it("renders Project Workspace tabs with the current tab highlighted", async () => {
    window.history.pushState({}, "", "/projects/project-123");

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
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "href",
      "/projects/project-123/tasks",
    );
    expect(screen.getByRole("link", { name: "RAID" })).toHaveAttribute(
      "href",
      "/projects/project-123/raid",
    );
    expect(screen.getByRole("link", { name: "Resources" })).toHaveAttribute(
      "href",
      "/projects/project-123/team",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/projects/project-123/reports",
    );
    expect(screen.getByRole("link", { name: "AI (future)" })).toHaveAttribute(
      "href",
      "/projects/project-123/reports",
    );
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("loads the Planning route inside the Project Workspace", async () => {
    window.history.pushState({}, "", "/projects/project-123/planning");

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
          name: "Selected Project Workspace",
        })
        .closest("header"),
    ).toHaveClass("shadow-ui-subtle");
  });

  it("loads the project Tasks route", async () => {
    window.history.pushState({}, "", "/projects/project-123/tasks");

    render(<ProjectTasksPage />);

    expect(
      await screen.findByText("Build workspace navigation"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("loads the project RAID route", async () => {
    window.history.pushState({}, "", "/projects/project-123/raid");

    render(<ProjectRaidPage />);

    expect(
      await screen.findByText("Supplier onboarding delay"),
    ).toBeInTheDocument();
    expect(screen.getByText("Integration outage")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "RAID" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen
        .getByRole("heading", {
          level: 1,
          name: "Selected Project Workspace",
        })
        .closest("header"),
    ).toHaveClass("shadow-ui-subtle");
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
        name: "External Document Links",
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
