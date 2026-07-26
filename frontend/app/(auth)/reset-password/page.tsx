"use client";

import React from "react";
import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/features/auth";

function PageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!token) {
      setError("This password reset link is invalid or has expired.");
      return;
    }

    if (!newPassword) {
      setError("New password is required");
      return;
    }

    if (!confirmPassword) {
      setError("Confirm password is required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await resetPassword({
        confirmPassword,
        newPassword,
        token,
      });
      setMessage(response.message);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reset password",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          PM Platform
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
          Create a new password
        </h1>

        <form
          className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-soft"
          onSubmit={handleSubmit}
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              New Password
            </span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              name="newPassword"
              required
              type="password"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">
              Confirm Password
            </span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              name="confirmPassword"
              required
              type="password"
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </p>
          ) : null}

          <button
            className="mt-5 block w-full rounded-md bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Reset Password"}
          </button>
        </form>

        <Link
          className="mt-4 text-sm font-semibold text-brand transition hover:text-teal-800"
          href="/login"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}

function PageLoading() {
  return <main className="min-h-screen bg-surface" />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  );
}
