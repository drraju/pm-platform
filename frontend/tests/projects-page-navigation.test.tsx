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
  getProject: vi.fn(async (projectId: string) => ({
    createdAt: "2026-06-01T10:00:00.000Z",
    description: "Workspace loaded from selected project id.",
    id: projectId,
    members: [],
    name: "Selected Project Workspace",
    status: "active",
    tasks: [],
  })),
  getProjectAssumptions: vi.fn(async () => []),
  getProjectDependencies: vi.fn(async () => []),
  getProjectIssues: vi.fn(async () => []),
  getProjectRisks: vi.fn(async () => []),
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
  getStoredAccessToken: () => "test-token",
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
  createProject: vi.fn(),
  getProject: projectMocks.getProject,
  getProjectAssumptions: projectMocks.getProjectAssumptions,
  getProjectDependencies: projectMocks.getProjectDependencies,
  getProjectIssues: projectMocks.getProjectIssues,
  getProjectRisks: projectMocks.getProjectRisks,
  getProjects: projectMocks.getProjects,
}));

vi.mock("@/features/users", () => ({
  getUsers: vi.fn(async () => []),
}));

describe("Projects List navigation", () => {
  beforeEach(() => {
    navigationMocks.push.mockClear();
    projectMocks.getProject.mockClear();
    projectMocks.getProjectAssumptions.mockClear();
    projectMocks.getProjectDependencies.mockClear();
    projectMocks.getProjectIssues.mockClear();
    projectMocks.getProjectRisks.mockClear();
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
      expect(projectMocks.getProjectRisks).toHaveBeenCalledWith("project-123");
      expect(projectMocks.getProjectIssues).toHaveBeenCalledWith("project-123");
      expect(projectMocks.getProjectAssumptions).toHaveBeenCalledWith(
        "project-123",
      );
      expect(projectMocks.getProjectDependencies).toHaveBeenCalledWith(
        "project-123",
      );
    });
    expect(
      await screen.findByRole("heading", {
        name: /Selected Project Workspace/i,
      }),
    ).toBeInTheDocument();
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
