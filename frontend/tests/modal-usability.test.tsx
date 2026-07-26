import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import { RaidManagement } from "@/components/raid/raid-management";
import { AppModal } from "@/components/ui/app-modal";
import ProjectsPage from "@/app/(app)/projects/page";

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
    ],
    roles: [],
    user: {
      email: "pm@example.com",
      firstName: "Program",
      id: "user-1",
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
  captureProjectBaseline: vi.fn(),
  createProject: vi.fn(),
  createProjectTaskDependency: vi.fn(),
  deleteProjectTaskDependency: vi.fn(),
  deleteProject: vi.fn(),
  getAssignableUsers: vi.fn(async () => [
    {
      email: "owner@example.com",
      firstName: "Ava",
      id: "user-1",
      lastName: "Patel",
      role: "PROJECT_MANAGER",
    },
  ]),
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
  getProject: vi.fn(async () => ({
    createdAt: "2026-06-01T10:00:00.000Z",
    id: "project-1",
    name: "ERP Modernization",
    ownerId: "user-1",
    status: "active",
  })),
  getProjectTaskDependencies: vi.fn(async () => []),
  getProjects: vi.fn(async () => [
    {
      createdAt: "2026-06-01T10:00:00.000Z",
      id: "project-1",
      name: "ERP Modernization",
      ownerId: "user-1",
      status: "active",
    },
  ]),
  updateProjectTaskDependency: vi.fn(),
  updateProject: vi.fn(),
}));

describe("AppModal usability", () => {
  it("constrains height and keeps header, body, and footer usable", () => {
    render(
      <AppModal
        footer={<button type="button">Save changes</button>}
        labelledById="test-modal-title"
        onClose={vi.fn()}
        title="Usability modal"
      >
        <div>Scrollable content</div>
      </AppModal>,
    );

    expect(screen.getByTestId("app-modal-panel")).toHaveClass("max-h-[90vh]");
    expect(screen.getByTestId("app-modal-header")).toHaveClass("sticky");
    expect(screen.getByTestId("app-modal-body")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("app-modal-footer")).toHaveClass("sticky");
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
  });

  it("closes on Escape for keyboard accessibility", () => {
    const onClose = vi.fn();
    render(
      <AppModal
        labelledById="escape-title"
        onClose={onClose}
        title="Escape modal"
      >
        Content
      </AppModal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("moves and traps keyboard focus within the dialog", () => {
    render(
      <AppModal
        footer={<button type="button">Save changes</button>}
        labelledById="focus-title"
        onClose={vi.fn()}
        title="Focus modal"
      >
        <input aria-label="Project name" />
      </AppModal>,
    );

    const closeButton = screen.getByRole("button", {
      name: /close focus modal/i,
    });
    const input = screen.getByRole("textbox", { name: /project name/i });
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(input).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(saveButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(saveButton).toHaveFocus();
  });

  it("restores focus to the invoking control when the dialog unmounts", () => {
    const { rerender } = render(<button type="button">Open modal</button>);
    const trigger = screen.getByRole("button", { name: /open modal/i });
    trigger.focus();

    rerender(
      <>
        <button type="button">Open modal</button>
        <AppModal
          labelledById="restore-title"
          onClose={vi.fn()}
          title="Restore modal"
        >
          Content
        </AppModal>
      </>,
    );
    expect(
      screen.getByRole("button", { name: /close restore modal/i }),
    ).toHaveFocus();

    rerender(<button type="button">Open modal</button>);
    expect(screen.getByRole("button", { name: /open modal/i })).toHaveFocus();
  });

  it("keeps task save actions outside the scrollable form body", () => {
    render(
      <ProjectWorkspaceTasks
        canCreateTasks
        members={[]}
        onCreateTask={vi.fn()}
        tasks={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    const footer = screen.getByTestId("app-modal-footer");
    expect(screen.getByTestId("app-modal-panel")).toHaveClass("max-h-[90vh]");
    expect(screen.getByTestId("app-modal-body")).toHaveClass("overflow-y-auto");
    expect(
      within(footer).getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
  });

  it("keeps project form actions in the sticky footer", async () => {
    render(<ProjectsPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /create project/i }),
    );

    expect(screen.getByTestId("app-modal-panel")).toHaveClass("max-h-[90vh]");
    expect(screen.getByTestId("app-modal-header")).toHaveClass("sticky");
    expect(screen.getByTestId("app-modal-body")).toHaveClass("overflow-y-auto");
    expect(
      within(screen.getByTestId("app-modal-footer")).getByRole("button", {
        name: /create project/i,
      }),
    ).toBeInTheDocument();
  });

  it("keeps RAID save actions in the sticky footer", () => {
    render(
      <RaidManagement
        emptyMessage="No risks yet."
        fixedProjectId="project-1"
        fixedType="risk"
        items={[]}
        onCreate={vi.fn()}
        permissions={{
          canCreate: true,
          canDelete: true,
          canUpdate: true,
          currentUserId: "user-1",
        }}
        projects={[{ id: "project-1", name: "Project", status: "active" }]}
        title="Risks"
        users={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create risk/i }));

    const footer = screen.getByTestId("app-modal-footer");
    expect(screen.getByTestId("app-modal-panel")).toHaveClass("max-h-[90vh]");
    expect(
      within(footer).getByRole("button", { name: /^create$/i }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
  });
});
