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
    roles: Array<{ name: string }>;
    user: { role?: { name: string } | null };
  }) => {
    const roleName =
      authMe.user.role?.name?.toLowerCase() ?? authMe.roles[0]?.name?.toLowerCase() ?? "";

    if (roleName === "executive") {
      return "/executive";
    }

    if (roleName === "portfolio manager") {
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
      permissions: [],
      roles: [{ id: "role-executive", name: "Executive", permissions: [] }],
      user: {
        email: "executive@example.com",
        firstName: "Executive",
        id: "user-executive",
        lastName: "User",
        role: { id: "role-executive", name: "Executive", permissions: [] },
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
      permissions: [],
      roles: [{ id: "role-portfolio", name: "Portfolio Manager", permissions: [] }],
      user: {
        email: "portfolio.manager@example.com",
        firstName: "Portfolio",
        id: "user-portfolio",
        lastName: "Manager",
        role: {
          id: "role-portfolio",
          name: "Portfolio Manager",
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
