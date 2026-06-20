import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/app/(app)/projects/page";
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
    tasks: [],
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
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a
      className={className}
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
    id: window.location.pathname.split("/").filter(Boolean).at(-1) ?? "",
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
    fireEvent.click(screen.getByRole("button", { name: /risks/i }));
    expect(screen.getByText("Supplier onboarding delay")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /issues/i }));
    expect(screen.getByText("Integration outage")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /assumptions/i }));
    expect(screen.getByText("Vendor API remains available")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /dependencies/i }));
    expect(screen.getByText("IAM approval")).toBeInTheDocument();
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
