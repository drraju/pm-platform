import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";

const authMocks = vi.hoisted(() => ({
  resetPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("token=query-token"),
}));

vi.mock("@/features/auth", () => ({
  resetPassword: authMocks.resetPassword,
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    authMocks.resetPassword.mockReset();
  });

  it("validates required fields and confirmation before submitting", async () => {
    render(<ResetPasswordPage />);

    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(
      await screen.findByText("New password is required"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Confirm password is required"),
    ).toBeInTheDocument();
    expect(authMocks.resetPassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/New Password/), {
      target: { value: "NewPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/), {
      target: { value: "Different1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(
      await screen.findByText("Password confirmation does not match"),
    ).toBeInTheDocument();
    expect(authMocks.resetPassword).not.toHaveBeenCalled();
  });

  it("resets the password with the query token", async () => {
    authMocks.resetPassword.mockResolvedValue({
      message: "Password reset successfully. Please sign in.",
      success: true,
    });
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/New Password/), {
      target: { value: "NewPass1!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/), {
      target: { value: "NewPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(authMocks.resetPassword).toHaveBeenCalledWith({
        confirmPassword: "NewPass1!",
        newPassword: "NewPass1!",
        token: "query-token",
      });
    });
    expect(
      await screen.findByText("Password reset successfully. Please sign in."),
    ).toBeInTheDocument();
  });
});
