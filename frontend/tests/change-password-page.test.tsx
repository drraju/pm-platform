import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChangePasswordPage from "@/app/(app)/settings/change-password/page";

const authMocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  clearSession: vi.fn(),
  getAuthMe: vi.fn(),
}));

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("@/features/auth", () => ({
  changePassword: authMocks.changePassword,
  clearSession: authMocks.clearSession,
  getAuthMe: authMocks.getAuthMe,
}));

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    authMocks.changePassword.mockReset();
    authMocks.clearSession.mockReset();
    authMocks.getAuthMe.mockReset();
    authMocks.getAuthMe.mockResolvedValue({
      permissions: [],
      roles: [],
      user: { id: "user-1", status: "active" },
    });
    routerPush.mockReset();
  });

  it("validates required fields and confirmation before submitting", async () => {
    render(<ChangePasswordPage />);

    fireEvent.click(screen.getByRole("button", { name: "Save Password" }));

    expect(
      await screen.findByText("Current password is required"),
    ).toBeInTheDocument();
    expect(screen.getByText("New password is required")).toBeInTheDocument();
    expect(
      screen.getByText("Confirm password is required"),
    ).toBeInTheDocument();
    expect(authMocks.changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Current Password/), {
      target: { value: "OldPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/New Password/), {
      target: { value: "NewPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/), {
      target: { value: "Different1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Password" }));

    expect(
      await screen.findByText("Password confirmation does not match"),
    ).toBeInTheDocument();
    expect(authMocks.changePassword).not.toHaveBeenCalled();
  });

  it("changes the password, clears the session, and redirects to login", async () => {
    authMocks.changePassword.mockResolvedValue({
      message: "Password changed successfully. Please sign in again.",
      requiresLogin: true,
      success: true,
    });
    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText(/Current Password/), {
      target: { value: "OldPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/New Password/), {
      target: { value: "NewPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/), {
      target: { value: "NewPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Password" }));

    await waitFor(() => {
      expect(authMocks.changePassword).toHaveBeenCalledWith({
        confirmPassword: "NewPass1!",
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
      });
    });
    expect(
      await screen.findByText(
        "Password changed successfully. Please sign in again.",
      ),
    ).toBeInTheDocument();
    await waitFor(
      () => {
        expect(routerPush).toHaveBeenCalledWith("/login");
      },
      { timeout: 1600 },
    );
  });

  it("shows generic API failures without clearing the session", async () => {
    authMocks.changePassword.mockRejectedValue(
      new Error("Unable to change password"),
    );
    render(<ChangePasswordPage />);

    fireEvent.change(screen.getByLabelText(/Current Password/), {
      target: { value: "WrongPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/New Password/), {
      target: { value: "NewPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/), {
      target: { value: "NewPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Password" }));

    expect(
      await screen.findByText("Unable to change password"),
    ).toBeInTheDocument();
    expect(authMocks.clearSession).not.toHaveBeenCalled();
  });
});
