import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";

const authMocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

const navigationState = vi.hoisted(() => ({
  token: "secure-reset-token",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "token" ? navigationState.token : null),
  }),
}));

vi.mock("@/features/auth", () => ({
  requestPasswordReset: authMocks.requestPasswordReset,
  resetPassword: authMocks.resetPassword,
}));

describe("Password reset pages", () => {
  beforeEach(() => {
    authMocks.requestPasswordReset.mockReset();
    authMocks.resetPassword.mockReset();
    navigationState.token = "secure-reset-token";
  });

  it("requests a reset with the generic success response", async () => {
    authMocks.requestPasswordReset.mockResolvedValue({
      message: "If an account exists, a password reset email has been sent.",
      success: true,
    });

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(authMocks.requestPasswordReset).toHaveBeenCalledWith(
        "user@example.com",
      );
    });
    expect(
      await screen.findByText(
        "If an account exists, a password reset email has been sent.",
      ),
    ).toBeInTheDocument();
  });

  it("validates reset confirmation before submitting", async () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "NewPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Different1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText("Password confirmation does not match"),
    ).toBeInTheDocument();
    expect(authMocks.resetPassword).not.toHaveBeenCalled();
  });

  it("submits a valid reset token and password", async () => {
    authMocks.resetPassword.mockResolvedValue({
      message: "Password reset successfully. Please sign in.",
      success: true,
    });

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "NewPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "NewPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(authMocks.resetPassword).toHaveBeenCalledWith({
        confirmPassword: "NewPass1!",
        newPassword: "NewPass1!",
        token: "secure-reset-token",
      });
    });
    expect(
      await screen.findByText("Password reset successfully. Please sign in."),
    ).toBeInTheDocument();
  });
});
