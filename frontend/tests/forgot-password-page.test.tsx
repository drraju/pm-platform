import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";

const authMocks = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  forgotPassword: authMocks.forgotPassword,
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    authMocks.forgotPassword.mockReset();
  });

  it("validates email before submitting", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(authMocks.forgotPassword).not.toHaveBeenCalled();
  });

  it("requests password reset and shows the generic response", async () => {
    authMocks.forgotPassword.mockResolvedValue({
      message:
        "If an account exists for that email, password reset instructions will be sent.",
      success: true,
    });
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Reset Link" }));

    await waitFor(() => {
      expect(authMocks.forgotPassword).toHaveBeenCalledWith("user@example.com");
    });
    expect(
      await screen.findByText(
        "If an account exists for that email, password reset instructions will be sent.",
      ),
    ).toBeInTheDocument();
  });
});
