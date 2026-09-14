import React, { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GoogleOidcCallbackPage from "@/app/(auth)/auth/google/callback/page";

const authMocks = vi.hoisted(() => ({
  clearSession: vi.fn(),
  exchangeGoogleOidcHandoff: vi.fn(),
  getAuthMe: vi.fn(),
  getDefaultDashboardPath: vi.fn(),
  storeAuthMe: vi.fn(),
  storeSession: vi.fn(),
}));

const routerPush = vi.fn();
const validHandoff = "a".repeat(43);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/features/auth", () => ({
  clearSession: authMocks.clearSession,
  exchangeGoogleOidcHandoff: authMocks.exchangeGoogleOidcHandoff,
  getAuthMe: authMocks.getAuthMe,
  getDefaultDashboardPath: authMocks.getDefaultDashboardPath,
  storeAuthMe: authMocks.storeAuthMe,
  storeSession: authMocks.storeSession,
}));

const activeAuthMe = {
  permissions: [],
  roles: [],
  user: {
    email: "user@example.com",
    firstName: "Example",
    id: "user-1",
    lastName: "User",
    role: null,
    status: "active",
  },
};

describe("Google OIDC callback page", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/auth/google/callback");
    routerPush.mockReset();
    authMocks.clearSession.mockReset();
    authMocks.exchangeGoogleOidcHandoff.mockReset();
    authMocks.getAuthMe.mockReset();
    authMocks.getDefaultDashboardPath.mockReset();
    authMocks.storeAuthMe.mockReset();
    authMocks.storeSession.mockReset();

    authMocks.exchangeGoogleOidcHandoff.mockResolvedValue({
      accessToken: "google-access-token",
      refreshToken: "google-refresh-token",
    });
    authMocks.getAuthMe.mockResolvedValue(activeAuthMe);
    authMocks.getDefaultDashboardPath.mockReturnValue("/dashboard");
  });

  it("shows a neutral completion state", () => {
    window.history.replaceState(
      {},
      "",
      `/auth/google/callback?handoff=${validHandoff}`,
    );

    render(<GoogleOidcCallbackPage />);

    expect(screen.getByText("Completing sign-in...")).toBeVisible();
  });

  it("cleans the URL and exchanges a valid handoff exactly once under Strict Mode", async () => {
    let searchAtExchange: string | null = null;
    authMocks.exchangeGoogleOidcHandoff.mockImplementation(async () => {
      searchAtExchange = window.location.search;
      return {
        accessToken: "google-access-token",
        refreshToken: "google-refresh-token",
      };
    });
    window.history.replaceState(
      {},
      "",
      `/auth/google/callback?handoff=${validHandoff}`,
    );

    render(
      <StrictMode>
        <GoogleOidcCallbackPage />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/dashboard");
    });
    expect(window.location.pathname).toBe("/auth/google/callback");
    expect(window.location.search).toBe("");
    expect(searchAtExchange).toBe("");
    expect(authMocks.exchangeGoogleOidcHandoff).toHaveBeenCalledTimes(1);
    expect(authMocks.exchangeGoogleOidcHandoff).toHaveBeenCalledWith(
      validHandoff,
    );
  });

  it("stores both tokens, loads auth/me, and uses the default dashboard route", async () => {
    window.history.replaceState(
      {},
      "",
      `/auth/google/callback?handoff=${validHandoff}`,
    );

    render(<GoogleOidcCallbackPage />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/dashboard");
    });
    expect(authMocks.storeSession).toHaveBeenCalledWith(
      "google-access-token",
      "google-refresh-token",
    );
    expect(authMocks.getAuthMe).toHaveBeenCalledTimes(1);
    expect(authMocks.storeAuthMe).toHaveBeenCalledWith(activeAuthMe);
    expect(authMocks.getDefaultDashboardPath).toHaveBeenCalledWith(
      activeAuthMe,
    );
    expect(
      authMocks.getAuthMe.mock.invocationCallOrder[0],
    ).toBeGreaterThan(authMocks.storeSession.mock.invocationCallOrder[0]);
  });

  it("routes first-login-pending users to change password", async () => {
    authMocks.getAuthMe.mockResolvedValue({
      ...activeAuthMe,
      user: { ...activeAuthMe.user, status: "first_login_pending" },
    });
    window.history.replaceState(
      {},
      "",
      `/auth/google/callback?handoff=${validHandoff}`,
    );

    render(<GoogleOidcCallbackPage />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/settings/change-password");
    });
    expect(authMocks.getDefaultDashboardPath).not.toHaveBeenCalled();
  });

  it("routes sessions requiring a password change to change password", async () => {
    authMocks.exchangeGoogleOidcHandoff.mockResolvedValue({
      accessToken: "google-access-token",
      refreshToken: "google-refresh-token",
      requiresPasswordChange: true,
    });
    window.history.replaceState(
      {},
      "",
      `/auth/google/callback?handoff=${validHandoff}`,
    );

    render(<GoogleOidcCallbackPage />);

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/settings/change-password");
    });
    expect(authMocks.getDefaultDashboardPath).not.toHaveBeenCalled();
  });

  it.each([
    [
      "access_denied",
      "Google sign-in was cancelled or access was denied. Please try again.",
    ],
    [
      "transaction_expired",
      "This sign-in attempt has expired. Please try again.",
    ],
    ["invalid_request", "This sign-in request is invalid. Please try again."],
    [
      "authentication_failed",
      "We could not complete Google sign-in. Please try again.",
    ],
  ])("renders a safe %s error", async (category, message) => {
    window.history.replaceState(
      {},
      "",
      `/auth/google/callback?error=${category}`,
    );

    render(<GoogleOidcCallbackPage />);

    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(window.location.search).toBe("");
    expect(authMocks.exchangeGoogleOidcHandoff).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing handoff", "/auth/google/callback"],
    ["a malformed handoff", "/auth/google/callback?handoff=short"],
    [
      "duplicate handoffs",
      `/auth/google/callback?handoff=${validHandoff}&handoff=${"b".repeat(43)}`,
    ],
    [
      "a handoff combined with an error",
      `/auth/google/callback?handoff=${validHandoff}&error=access_denied`,
    ],
  ])("fails safely for %s", async (_case, url) => {
    window.history.replaceState({}, "", url);

    render(<GoogleOidcCallbackPage />);

    expect(
      await screen.findByText("This sign-in request is invalid. Please try again."),
    ).toBeVisible();
    expect(authMocks.exchangeGoogleOidcHandoff).not.toHaveBeenCalled();
  });

  it.each(["expired", "replayed"])(
    "fails safely when a handoff is %s",
    async () => {
      authMocks.exchangeGoogleOidcHandoff.mockRejectedValue(
        new Error("transaction_expired"),
      );
      window.history.replaceState(
        {},
        "",
        `/auth/google/callback?handoff=${validHandoff}`,
      );

      render(<GoogleOidcCallbackPage />);

      expect(
        await screen.findByText(
          "We could not complete Google sign-in. Please try again.",
        ),
      ).toBeVisible();
      expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
      expect(authMocks.storeSession).not.toHaveBeenCalled();
    },
  );

  it("clears the partial session when auth/me fails", async () => {
    authMocks.getAuthMe.mockRejectedValue(new Error("database detail"));
    window.history.replaceState(
      {},
      "",
      `/auth/google/callback?handoff=${validHandoff}`,
    );

    render(<GoogleOidcCallbackPage />);

    expect(
      await screen.findByText(
        "We could not complete Google sign-in. Please try again.",
      ),
    ).toBeVisible();
    expect(authMocks.storeSession).toHaveBeenCalledTimes(1);
    expect(authMocks.clearSession).toHaveBeenCalledTimes(1);
    expect(authMocks.storeAuthMe).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });
});
