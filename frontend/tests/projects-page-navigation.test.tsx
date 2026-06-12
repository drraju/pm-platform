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
  createProjectTask: vi.fn(),
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
  removeProjectMember: vi.fn(),
  updateProjectTask: vi.fn(),
  updateProjectMember: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn((href: string) => {
    window.history.pushState({}, "", href);
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
  useRouter: () => ({
    push: navigationMocks.push,
  }),
}));

vi.mock("@/features/projects", () => ({
  addProjectMember: projectMocks.addProjectMember,
  createProjectTask: projectMocks.createProjectTask,
  createProject: vi.fn(),
  deleteProjectTask: projectMocks.deleteProjectTask,
  getAssignableUsers: projectMocks.getAssignableUsers,
  getProject: projectMocks.getProject,
  getProjects: projectMocks.getProjects,
  removeProjectMember: projectMocks.removeProjectMember,
  updateProjectTask: projectMocks.updateProjectTask,
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
    expect(screen.getByText("Supplier onboarding delay")).toBeInTheDocument();
    expect(screen.getByText("Integration outage")).toBeInTheDocument();
    expect(screen.getByText("Vendor API remains available")).toBeInTheDocument();
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
