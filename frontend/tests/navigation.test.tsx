import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

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
  hasAnyPermission: (permissionKeys: string[], requiredPermissions: string[]) => {
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

      return (aliases[permission] ?? []).some((alias) => permissionKeys.includes(alias));
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

  it("renders primary navigation and page content for a program manager", async () => {
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
      roles: [{ id: "role-1", name: "Program Manager", permissions: [] }],
      user: {
        email: "program.manager@example.com",
        firstName: "Program",
        id: "user-1",
        lastName: "Manager",
        role: { id: "role-1", name: "Program Manager", permissions: [] },
        status: "active",
      },
    });

    render(
      <AppShell>
        <h1>Workspace content</h1>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Program Manager")).toHaveLength(2);
    });

    expect(screen.getByRole("link", { name: /pm command center/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /executive/i })).toHaveAttribute(
      "href",
      "/executive",
    );
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
    expect(screen.getByRole("link", { name: /notifications/i })).toHaveAttribute(
      "href",
      "/notifications",
    );
    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /enterprise calendars/i }),
    ).toHaveAttribute("href", "/calendar");
    expect(
      screen.getByRole("searchbox", { name: /global search/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("PM")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
  });

  it("shows engineer navigation without executive-only links", async () => {
    authMocks.getAuthMe.mockResolvedValue({
      permissions: [
        { id: "permission-dashboard", key: "dashboard.view" },
        { id: "permission-project-read", key: "project.read" },
        { id: "permission-task-update-own", key: "project-tasks:update:own" },
        { id: "permission-raid-read-assigned", key: "raid:read:assigned" },
        { id: "permission-notification-read", key: "notification.read" },
      ],
      roles: [{ id: "role-2", name: "Engineer", permissions: [] }],
      user: {
        email: "engineer@example.com",
        firstName: "Elena",
        id: "user-2",
        lastName: "Ng",
        role: { id: "role-2", name: "Engineer", permissions: [] },
        status: "active",
      },
    });

    render(
      <AppShell>
        <h1>Engineer workspace</h1>
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("Engineer")).toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: /notifications/i })).toHaveAttribute(
      "href",
      "/notifications",
    );
    expect(
      screen.queryByRole("link", { name: /executive/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /portfolio/i }),
    ).not.toBeInTheDocument();
  });
});
