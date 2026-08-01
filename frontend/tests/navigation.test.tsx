import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { isNavigationItemActive } from "@/components/layout/app-navigation";
import { getWorkspaceContext } from "@/components/layout/workspace-context";

const authMocks = vi.hoisted(() => ({
  getAuthMe: vi.fn(),
  storeAuthMe: vi.fn(),
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
    <a className={className} href={href}>
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

vi.mock("@/features/auth", () => ({
  clearSession: vi.fn(),
  getAuthMe: authMocks.getAuthMe,
  getStoredPermissionKeys: vi.fn(() => []),
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
      expect(screen.getByText("PORTFOLIO_MANAGER")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /pm platform enterprise workspace/i }),
    ).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: /intelligence/i })).toHaveAttribute(
      "href",
      "/executive",
    );
    expect(screen.getByRole("link", { name: /projects/i })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(
      screen.getByRole("link", { name: /daily review/i }),
    ).toHaveAttribute("href", "/daily-review");
    expect(screen.getByRole("link", { name: /my tasks/i })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByRole("link", { name: /risks/i })).toHaveAttribute(
      "href",
      "/risks",
    );
    expect(screen.getByRole("link", { name: /issues/i })).toHaveAttribute(
      "href",
      "/issues",
    );
    expect(
      screen.getByRole("link", { name: /notifications/i }),
    ).toHaveAttribute("href", "/notifications");
    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.getByText("Workspaces")).toBeInTheDocument();
    expect(screen.getByText("Work queues")).toBeInTheDocument();
    expect(
      screen.getByText("Planning").closest("[aria-disabled='true']"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Resources").closest("[aria-disabled='true']"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /enterprise calendars/i }),
    ).toHaveAttribute("href", "/calendar");
    expect(
      screen.getByRole("button", { name: /open command palette/i }),
    ).toHaveAttribute("aria-haspopup", "dialog");
    expect(
      screen.getByRole("button", { name: /ai assistant/i }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("navigation", { name: /breadcrumb/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Current workspace: Home"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("PM")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
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
      expect(screen.getByText("TEAM_MEMBER")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /projects/i })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: /my tasks/i })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByRole("link", { name: /risks/i })).toHaveAttribute(
      "href",
      "/risks",
    );
    expect(screen.getByRole("link", { name: /issues/i })).toHaveAttribute(
      "href",
      "/issues",
    );
    expect(
      screen.getByRole("link", { name: /notifications/i }),
    ).toHaveAttribute("href", "/notifications");
    expect(
      screen.queryByRole("link", { name: /intelligence/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /portfolio/i }),
    ).not.toBeInTheDocument();
  });
});

describe("workspace route context", () => {
  it("maps project planning routes to the Planning workspace", () => {
    expect(getWorkspaceContext("/projects/project-1/planning")).toEqual({
      breadcrumbs: [
        { href: "/projects", label: "Projects" },
        { href: "/projects/project-1", label: "Project" },
        { label: "Planning" },
      ],
      description: "Project plan authoring and analysis",
      title: "Planning",
    });
  });

  it("preserves the project overview link on deep project routes", () => {
    expect(getWorkspaceContext("/projects/project-1/raid").breadcrumbs).toEqual(
      [
        { href: "/projects", label: "Projects" },
        { href: "/projects/project-1", label: "Project" },
        { label: "Raid" },
      ],
    );
  });

  it("maps project queues without losing their Projects workspace context", () => {
    expect(getWorkspaceContext("/risks").title).toBe("Projects");
    expect(getWorkspaceContext("/tasks").breadcrumbs.at(-1)?.label).toBe(
      "My Tasks",
    );
  });

  it("marks Planning instead of Projects active on a planning route", () => {
    expect(
      isNavigationItemActive("/projects/project-1/planning", {
        label: "Planning",
        permissions: ["project.read"],
        section: "Workspaces",
      }),
    ).toBe(true);
    expect(
      isNavigationItemActive("/projects/project-1/planning", {
        href: "/projects",
        label: "Projects",
        permissions: ["project.read"],
        section: "Workspaces",
      }),
    ).toBe(false);
  });
});
