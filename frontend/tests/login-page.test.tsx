import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";

const authMocks = vi.hoisted(() => ({
  getAuthMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  storeAuthMe: vi.fn(),
  storeSession: vi.fn(),
}));

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("@/features/auth", () => ({
  getAuthMe: authMocks.getAuthMe,
  getDefaultDashboardPath: (authMe: {
    permissions: Array<{ key: string }>;
    roles: Array<{ name: string }>;
    user: { role?: { name: string } | null };
  }) => {
    const permissionKeys = authMe.permissions.map(
      (permission) => permission.key,
    );
    if (permissionKeys.includes("executive.view")) {
      return "/executive";
    }

    if (permissionKeys.includes("portfolio.view")) {
      return "/portfolio";
    }

    return "/dashboard";
  },
  login: authMocks.login,
  register: authMocks.register,
  storeAuthMe: authMocks.storeAuthMe,
  storeSession: authMocks.storeSession,
}));

describe("Login page", () => {
  beforeEach(() => {
    routerPush.mockReset();
    authMocks.getAuthMe.mockReset();
    authMocks.login.mockReset();
    authMocks.register.mockReset();
    authMocks.storeAuthMe.mockReset();
    authMocks.storeSession.mockReset();

    authMocks.login.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
  });

  it("routes executive users to the executive dashboard after login", async () => {
    authMocks.getAuthMe.mockResolvedValue({
      permissions: [{ id: "permission-executive", key: "executive.view" }],
      roles: [{ id: "role-executive", name: "EXECUTIVE", permissions: [] }],
      user: {
        email: "executive@example.com",
        firstName: "Executive",
        id: "user-executive",
        lastName: "User",
        role: { id: "role-executive", name: "EXECUTIVE", permissions: [] },
        status: "active",
      },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "executive@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/executive");
    });
  });

  it("routes portfolio managers to the portfolio dashboard after login", async () => {
    authMocks.getAuthMe.mockResolvedValue({
      permissions: [{ id: "permission-portfolio", key: "portfolio.view" }],
      roles: [
        { id: "role-portfolio", name: "PORTFOLIO_MANAGER", permissions: [] },
      ],
      user: {
        email: "portfolio.manager@example.com",
        firstName: "Portfolio",
        id: "user-portfolio",
        lastName: "Manager",
        role: {
          id: "role-portfolio",
          name: "PORTFOLIO_MANAGER",
          permissions: [],
        },
        status: "active",
      },
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "portfolio.manager@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/portfolio");
    });
  });
});
