"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ErrorState,
  LoadingState,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceLayout,
} from "@/components/foundation";
import { changePassword, clearSession } from "@/features/auth";

type FormErrors = {
  confirmPassword?: string;
  currentPassword?: string;
  newPassword?: string;
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    },
    [],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setServerError(null);
    setSuccessMessage(null);

    const formData = new FormData(form);
    const input = {
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
    };
    const nextErrors = validateForm(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await changePassword(input);
      setErrors({});
      setSuccessMessage(result.message);
      form.reset();
      clearSession();
      redirectTimer.current = setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Unable to change password. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    router.push("/dashboard");
  }

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        eyebrow="User settings"
        title="Change Password"
        subtitle="Update your account password and sign in again to continue working."
      />

      <WorkspaceContent as="section">
        <form
          className="max-w-xl space-y-5 rounded-ui border border-slate-200 bg-white p-5 shadow-sm"
          onChange={() => {
            setErrors({});
            setServerError(null);
          }}
          onSubmit={handleSubmit}
        >
          {serverError ? (
            <ErrorState
              message={serverError}
              title="Password could not be changed"
            />
          ) : null}

          {successMessage ? (
            <div
              className="rounded-ui border border-status-success-border bg-status-success-surface px-4 py-3 text-sm font-medium text-status-success-strong"
              role="status"
            >
              {successMessage}
            </div>
          ) : null}

          <PasswordField
            autoComplete="current-password"
            error={errors.currentPassword}
            label="Current Password"
            name="currentPassword"
          />
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

          {isSaving ? (
            <LoadingState compact label="Saving password" rows={1} />
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              className="min-h-10 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              disabled={isSaving}
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-10 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save Password"}
            </button>
          </div>
        </form>
      </WorkspaceContent>
    </WorkspaceLayout>
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
        className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
  currentPassword: string;
  newPassword: string;
}) {
  const errors: FormErrors = {};

  if (!input.currentPassword.trim()) {
    errors.currentPassword = "Current password is required";
  }
  if (!input.newPassword.trim()) {
    errors.newPassword = "New password is required";
  }
  if (!input.confirmPassword.trim()) {
    errors.confirmPassword = "Confirm password is required";
  } else if (input.newPassword !== input.confirmPassword) {
    errors.confirmPassword = "Password confirmation does not match";
  }

  return errors;
}
