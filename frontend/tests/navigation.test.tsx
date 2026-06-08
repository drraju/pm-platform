import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

const authMocks = vi.hoisted(() => ({
  clearSession: vi.fn(),
  useAuthorization: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  clearSession: authMocks.clearSession,
  useAuthorization: authMocks.useAuthorization,
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

describe("AppShell", () => {
  beforeEach(() => {
    authMocks.clearSession.mockReset();
    authMocks.useAuthorization.mockReturnValue({
      hasAnyPermission: (permissions: string[]) =>
        permissions.some((permission) =>
          [
            "dashboard:read:self",
            "executive:summary:read",
            "portfolio:summary:read",
            "projects:read:assigned",
            "raid:read:assigned",
            "users:manage",
          ].includes(permission),
        ),
      isLoading: false,
    });
  });

  it("renders primary navigation and page content", () => {
    render(
      <AppShell>
        <h1>Workspace content</h1>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
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
    expect(screen.getByRole("link", { name: /portfolio/i })).toHaveAttribute(
      "href",
      "/portfolio",
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
    expect(screen.getByRole("link", { name: /admin/i })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      screen.getByRole("searchbox", { name: /global search/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
  });

  it("hides navigation items without matching permissions", () => {
    authMocks.useAuthorization.mockReturnValue({
      hasAnyPermission: (permissions: string[]) =>
        permissions.includes("dashboard:read:self"),
      isLoading: false,
    });

    render(
      <AppShell>
        <h1>Workspace content</h1>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /executive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /portfolio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
  });
});
