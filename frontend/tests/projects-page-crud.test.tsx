import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "@/app/(app)/projects/page";
import { dispatchApplicationCommandAction } from "@/features/commands";

const projectMocks = vi.hoisted(() => ({
  archiveProject: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  getAssignableUsers: vi.fn(async () => [
    {
      email: "ava@example.com",
      firstName: "Ava",
      id: "user-1",
      lastName: "Patel",
      role: "PROJECT_MANAGER",
    },
    {
      email: "liam@example.com",
      firstName: "Liam",
      id: "user-2",
      lastName: "Wong",
      role: "EXECUTIVE",
    },
  ]),
  getProject: vi.fn(async (projectId: string) => ({
    businessOwner: {
      email: "ava@example.com",
      firstName: "Ava",
      id: "user-1",
      lastName: "Patel",
      status: "active",
    },
    businessOwnerId: "user-1",
    createdAt: "2026-06-01T10:00:00.000Z",
    deliveryLead: {
      email: "ava@example.com",
      firstName: "Ava",
      id: "user-1",
      lastName: "Patel",
      status: "active",
    },
    deliveryLeadId: "user-1",
    description: "Finance transformation delivery.",
    executiveSponsor: {
      email: "liam@example.com",
      firstName: "Liam",
      id: "user-2",
      lastName: "Wong",
      status: "active",
    },
    executiveSponsorId: "user-2",
    id: projectId,
    name: "ERP Modernization",
    owner: {
      email: "ava@example.com",
      firstName: "Ava",
      id: "user-1",
      lastName: "Patel",
      status: "active",
    },
    ownerId: "user-1",
    startDate: "2026-01-01",
    status: "active",
    targetEndDate: "2026-09-30",
  })),
  getProjects: vi.fn(async () => [
    {
      createdAt: "2026-06-01T10:00:00.000Z",
      id: "project-1",
      name: "ERP Modernization",
      owner: {
        email: "ava@example.com",
        firstName: "Ava",
        id: "user-1",
        lastName: "Patel",
        status: "active",
      },
      ownerId: "user-1",
      status: "active",
    },
  ]),
  purgeProject: vi.fn(),
  restoreProject: vi.fn(),
  updateProject: vi.fn(),
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
      { id: "permission-project-create", key: "project.create" },
      { id: "permission-project-update", key: "project.update" },
      { id: "permission-project-delete", key: "project.delete" },
      { id: "permission-project-read", key: "project.read" },
    ],
    roles: [],
    user: {
      email: "project.manager@example.com",
      firstName: "Project",
      id: "user-manager",
      lastName: "Manager",
      roleId: "role-1",
      status: "active",
    },
  })),
  getStoredAccessToken: () => "test-token",
  getStoredPermissionKeys: () => [],
  hasPermission: (permissionKeys: string[], requiredPermission: string) =>
    permissionKeys.includes(requiredPermission),
  storeAuthMe: vi.fn(),
}));

vi.mock("@/features/projects", () => ({
  archiveProject: projectMocks.archiveProject,
  captureProjectBaseline: vi.fn(),
  createProject: projectMocks.createProject,
  createProjectTaskDependency: vi.fn(),
  deleteProjectTaskDependency: vi.fn(),
  deleteProject: projectMocks.deleteProject,
  getAssignableUsers: projectMocks.getAssignableUsers,
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
  purgeProject: projectMocks.purgeProject,
  restoreProject: projectMocks.restoreProject,
  updateProject: projectMocks.updateProject,
  updateProjectTaskDependency: vi.fn(),
}));

describe("ProjectsPage CRUD", () => {
  beforeEach(() => {
    projectMocks.archiveProject.mockReset();
    projectMocks.createProject.mockReset();
    projectMocks.deleteProject.mockReset();
    projectMocks.getAssignableUsers.mockClear();
    projectMocks.getProject.mockClear();
    projectMocks.getProjects.mockClear();
    projectMocks.purgeProject.mockReset();
    projectMocks.restoreProject.mockReset();
    projectMocks.updateProject.mockReset();
  });

  it("opens an edit dialog with governance fields and submits updates", async () => {
    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /edit/i }));

    expect(
      await screen.findByDisplayValue("ERP Modernization"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Finance transformation delivery.",
    );

    fireEvent.change(screen.getByLabelText("Business Owner"), {
      target: { value: "user-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(projectMocks.updateProject).toHaveBeenCalledWith("project-1", {
        businessOwnerId: "user-2",
        deliveryLeadId: "user-1",
        description: "Finance transformation delivery.",
        executiveSponsorId: "user-2",
        name: "ERP Modernization",
        ownerId: "user-1",
        startDate: "2026-01-01",
        status: "active",
        targetEndDate: "2026-09-30",
      });
    });
  });

  it("confirms and archives a project", async () => {
    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: /archive/i }));
    const archiveDialog = screen.getByRole("dialog", {
      name: /archive project/i,
    });
    expect(
      within(archiveDialog).getByText(/confirm archive of/i),
    ).toBeInTheDocument();

    fireEvent.click(
      within(archiveDialog).getByRole("button", {
        name: /^archive project$/i,
      }),
    );

    await waitFor(() => {
      expect(projectMocks.archiveProject).toHaveBeenCalledWith("project-1");
    });
  });

  it("opens the existing create dialog from a contextual command", async () => {
    render(<ProjectsPage />);

    await screen.findByRole("button", { name: /create project/i });
    act(() => {
      dispatchApplicationCommandAction({ type: "project.create" });
    });

    expect(
      await screen.findByRole("dialog", { name: /^create project$/i }),
    ).toBeInTheDocument();
  });
});
