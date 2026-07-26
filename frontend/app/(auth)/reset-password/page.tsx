"use client";

import React, { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/features/auth";

type FormErrors = {
  confirmPassword?: string;
  newPassword?: string;
  token?: string;
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const input = {
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      token: String(formData.get("token") ?? "").trim(),
    };
    const nextErrors = validateForm(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await resetPassword(input);
      setSuccessMessage(response.message);
      form.reset();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Unable to reset password",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            PM Platform
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            Set a new password
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Use your reset token to restore access to your account.
          </p>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold tracking-normal text-slate-950">
            Reset password
          </h2>

          <form
            className="mt-6 space-y-4"
            onChange={() => {
              setErrors({});
              setServerError(null);
            }}
            onSubmit={handleSubmit}
          >
            <PasswordField
              autoComplete="new-password"
              error={errors.newPassword}
              label="New Password"
              name="newPassword"
            />
            <PasswordField
              autoComplete="new-password"
              error={errors.confirmPassword}
              label="Confirm Password"
              name="confirmPassword"
            />

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Reset Token
              </span>
              <input
                aria-describedby={errors.token ? "token-error" : undefined}
                aria-invalid={Boolean(errors.token)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                defaultValue={initialToken}
                name="token"
              />
              {errors.token ? (
                <span
                  className="mt-1 block text-sm text-status-danger"
                  id="token-error"
                >
                  {errors.token}
                </span>
              ) : null}
            </label>

            {successMessage ? (
              <p className="rounded-md border border-status-success-border bg-status-success-surface px-3 py-2 text-sm text-status-success-strong">
                {successMessage}
              </p>
            ) : null}

            {serverError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {serverError}
              </p>
            ) : null}

            <button
              className="block w-full rounded-md bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Saving..." : "Reset Password"}
            </button>

            <Link
              className="block text-center text-sm font-semibold text-brand transition hover:text-teal-800"
              href="/login"
            >
              Back to sign in
            </Link>
          </form>
        </section>
      </div>
    </main>
  );
}

function PasswordField({
  autoComplete,
  error,
  label,
  name,
}: {
  autoComplete: string;
  error?: string;
  label: string;
  name: string;
}) {
  const errorId = `${name}-error`;
  const inputId = `${name}-input`;

  return (
    <label className="block" htmlFor={inputId}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        id={inputId}
        name={name}
        type="password"
      />
      {error ? (
        <span className="mt-1 block text-sm text-status-danger" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function validateForm(input: {
  confirmPassword: string;
  newPassword: string;
  token: string;
}) {
  const errors: FormErrors = {};

  if (!input.newPassword.trim()) {
    errors.newPassword = "New password is required";
  }
  if (!input.confirmPassword.trim()) {
    errors.confirmPassword = "Confirm password is required";
  } else if (input.newPassword !== input.confirmPassword) {
    errors.confirmPassword = "Password confirmation does not match";
  }
  if (!input.token) {
    errors.token = "Reset token is required";
  }

  return errors;
}

function PageLoading() {
  return <main className="min-h-screen bg-surface" />;
}
