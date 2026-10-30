import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { isNavigationItemActive } from "@/components/layout/app-navigation";
import { getWorkspaceContext } from "@/components/layout/workspace-context";

const authMocks = vi.hoisted(() => ({
  getAuthMe: vi.fn(),
  getStoredRoleNames: vi.fn(() => []),
  storeAuthMe: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/features/notifications", () => ({
  getUnreadNotificationCount: vi.fn(async () => 0),
}));

vi.mock("@/features/auth", () => ({
  clearSession: vi.fn(),
  getAuthMe: authMocks.getAuthMe,
  getLandingPath: (permissionKeys: string[]) =>
    permissionKeys.includes("work.update") ||
    permissionKeys.includes("task.update")
      ? "/today"
      : "/start",
  getStoredPermissionKeys: vi.fn(() => []),
  getStoredRoleNames: authMocks.getStoredRoleNames,
  useStoredAuthSession: () => ({
    permissionKeys: [] as string[],
    roleNames: [] as string[],
  }),
  hasAnyPermission: (
    permissionKeys: string[],
    requiredPermissions: string[],
  ) => {
    const aliases: Record<string, string[]> = {
      "dashboard.view": ["dashboard:read:self"],
      "executive.view": ["executive:summary:read"],
      "portfolio.view": ["portfolio:summary:read"],
      "project.read": ["projects:read:all", "projects:read:assigned"],
      "project.update": ["projects:update:any", "projects:update:assigned"],
      "raid.read": ["raid:read:all", "raid:read:assigned"],
      "task.comment": ["project-tasks:update:any", "project-tasks:update:own"],
      "task.update": ["project-tasks:update:any", "project-tasks:update:own"],
      "notification.read": ["notifications:read"],
    };

    return requiredPermissions.some((permission) => {
      if (permissionKeys.includes(permission)) {
        return true;
      }

      return (aliases[permission] ?? []).some((alias) =>
        permissionKeys.includes(alias),
      );
    });
  },
  resolveProjectUiCapabilities: ({
    currentUserId,
    permissionKeys = [],
    roleNames = [],
    task,
  }: {
    currentUserId?: string | null;
    permissionKeys?: string[];
    roleNames?: string[];
    task?: { assigneeId?: string | null } | null;
  }) => {
    const canUpdateTasks =
      permissionKeys.includes("task.update") ||
      permissionKeys.includes("task.comment") ||
      permissionKeys.includes("task.reassign");
    const canUpdateOwnTask =
      canUpdateTasks && Boolean(currentUserId) && task?.assigneeId === currentUserId;
    const canAccessStandup =
      roleNames.some((roleName) =>
        [
          "PLATFORM_ADMIN",
          "PORTFOLIO_MANAGER",
          "PROJECT_MANAGER",
          "PROGRAM_MANAGER",
          "SUPER_ADMIN",
        ].includes(roleName),
      ) &&
      permissionKeys.includes("project.read") &&
      permissionKeys.includes("task.update");
    const canExecuteWork =
      permissionKeys.includes("project.read") &&
      permissionKeys.includes("task.update");
    return {
      canAccessDailyReview: canAccessStandup,
      canAccessDelivery: canExecuteWork,
      canAccessGovern: false,
      canAccessPlanning: false,
      canAccessToday: canExecuteWork,
      canApproveDocuments: false,
      canContributeDocuments: permissionKeys.includes("project.read"),
      canEditDocument: false,
      canEditExecution: canUpdateOwnTask,
      canEditPlanning: false,
      canExecuteAssignedTask: canUpdateOwnTask,
      canManageDocuments: false,
      canManageProjectTasks: false,
      canManageTeam: false,
      canReassignTask: canUpdateOwnTask && permissionKeys.includes("task.reassign"),
      canUpdateTask: canUpdateOwnTask,
      canUploadDocuments: permissionKeys.includes("project.read"),
    };
  },
  storeAuthMe: authMocks.storeAuthMe,
}));

describe("AppShell", () => {
  beforeEach(() => {
    authMocks.getAuthMe.mockReset();
    authMocks.storeAuthMe.mockReset();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  it("renders primary navigation and page content for a portfolio manager", async () => {
    authMocks.getAuthMe.mockResolvedValue({
      permissions: [
        { id: "permission-dashboard", key: "dashboard.view" },
        { id: "permission-executive", key: "executive.view" },
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-project-update", key: "project.update" },
        { id: "permission-task-update", key: "task.update" },
        { id: "permission-raid-read", key: "raid.read" },
        { id: "permission-notification-read", key: "notification.read" },
      ],
      roles: [{ id: "role-1", name: "PORTFOLIO_MANAGER", permissions: [] }],
      user: {
        email: "program.manager@example.com",
        firstName: "Portfolio",
        id: "user-1",
        lastName: "Manager",
        role: { id: "role-1", name: "PORTFOLIO_MANAGER", permissions: [] },
        status: "active",
      },
    });

    render(
      <AppShell>
        <h1>Workspace content</h1>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("Portfolio Manager")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /^today$/i })).toHaveAttribute(
      "href",
      "/today",
    );
    expect(screen.getByRole("link", { name: /^projects$/i })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(
      screen.queryByRole("link", { name: /^people$/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^customers$/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /programs|dashboard|daily review|risks|issues|calendars/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ai assistant/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open command palette/i })).not.toBeInTheDocument();
    expect(document.querySelector("[aria-disabled='true']")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: /application navigation/i }),
    ).toHaveClass("lg:block");
  });

  it("shows team member navigation without executive-only links", async () => {
    authMocks.getAuthMe.mockResolvedValue({
      permissions: [
        { id: "permission-dashboard", key: "dashboard.view" },
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-task-update", key: "task.update" },
        { id: "permission-raid-read", key: "raid.read" },
        { id: "permission-notification-read", key: "notification.read" },
      ],
      roles: [{ id: "role-2", name: "TEAM_MEMBER", permissions: [] }],
      user: {
        email: "team.member@example.com",
        firstName: "Team",
        id: "user-2",
        lastName: "Member",
        role: { id: "role-2", name: "TEAM_MEMBER", permissions: [] },
        status: "active",
      },
    });

    render(
      <AppShell>
        <h1>Team member workspace</h1>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("Team Member")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /^today$/i })).toHaveAttribute(
      "href",
      "/today",
    );
    expect(screen.getByRole("link", { name: /^projects$/i })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.queryByRole("link", { name: /^people$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^customers$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^notifications$/i })).toHaveAttribute(
      "href",
      "/notifications",
    );
    expect(screen.queryByRole("link", { name: /^programs$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("TEAM_MEMBER")).not.toBeInTheDocument();
  });

  it("shows People to an admin and still hides rooms that are not ready", async () => {
    authMocks.getAuthMe.mockResolvedValue({
      permissions: [
        { id: "permission-work", key: "work.update" },
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-users", key: "user.manage" },
        { id: "permission-customers", key: "customer.read" },
        { id: "permission-programs", key: "program.view" },
        { id: "permission-auth", key: "auth.configure" },
      ],
      roles: [{ id: "role-admin", name: "PLATFORM_ADMIN", permissions: [] }],
      user: {
        email: "admin@example.com",
        firstName: "Asha",
        id: "user-admin",
        lastName: "Rao",
        role: { id: "role-admin", name: "PLATFORM_ADMIN", permissions: [] },
        status: "active",
      },
    });

    render(
      <AppShell>
        <h1>Admin workspace</h1>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /^people$/i })).toHaveAttribute(
      "href",
      "/users",
    );
    expect(screen.getByRole("link", { name: /^customers$/i })).toHaveAttribute(
      "href",
      "/customers",
    );
    expect(screen.getByRole("link", { name: /^programs$/i })).toHaveAttribute(
      "href",
      "/programs",
    );
    expect(screen.getByRole("combobox", { name: /search customers, projects, and work/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /notifications/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign-in/i })).not.toBeInTheDocument();
    expect(screen.queryByText("PLATFORM_ADMIN")).not.toBeInTheDocument();
  });
});

describe("workspace route context", () => {
  it("maps the project plan route to Plan", () => {
    expect(getWorkspaceContext("/projects/project-1/plan")).toEqual({
      breadcrumbs: [
        { href: "/projects", label: "Projects" },
        { href: "/projects/project-1", label: "Project" },
        { label: "Plan" },
      ],
      description: "Schedule for this project",
      title: "Plan",
    });
    expect(getWorkspaceContext("/projects/project-1/board").title).toBe("Board");
  });

  it("preserves the project overview link on deep project routes", () => {
    expect(getWorkspaceContext("/projects/project-1/govern").breadcrumbs).toEqual(
      [
        { href: "/projects", label: "Projects" },
        { href: "/projects/project-1", label: "Project" },
        { label: "RAID" },
      ],
    );
    expect(getWorkspaceContext("/projects/project-1/delivery").title).toBe(
      "Delivery",
    );
  });

  it("maps project queues without losing their Projects workspace context", () => {
    expect(getWorkspaceContext("/risks").title).toBe("Projects");
    expect(getWorkspaceContext("/tasks").breadcrumbs.at(-1)?.label).toBe(
      "Today",
    );
    expect(getWorkspaceContext("/today")).toEqual({
      breadcrumbs: [{ label: "Today" }],
      description: "Project execution",
      title: "Today",
    });
  });

  it("labels Programs without calling it Dashboard", () => {
    expect(getWorkspaceContext("/programs")).toEqual({
      breadcrumbs: [{ label: "Programs" }],
      description: "Projects grouped for leadership",
      title: "Programs",
    });
    expect(getWorkspaceContext("/executive").title).toBe("Programs");
    expect(getWorkspaceContext("/programs").title).not.toMatch(/dashboard/i);
  });

  it("does not mark Projects active inside a project plan", () => {
    expect(
      isNavigationItemActive("/projects/project-1/planning", {
        href: "/projects",
        id: "projects",
        label: "Projects",
        permissions: ["project.read"],
        section: "Delivery",
      }),
    ).toBe(false);
  });
});
