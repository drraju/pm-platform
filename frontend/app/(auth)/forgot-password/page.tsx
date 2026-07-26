"use client";

import React, { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/features/auth";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setServerError(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    if (!email) {
      setEmailError("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await forgotPassword(email);
      setSuccessMessage(response.message);
      event.currentTarget.reset();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Unable to request password reset",
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
            Reset access securely
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Request a password reset link for your PM Platform account.
          </p>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold tracking-normal text-slate-950">
            Forgot password
          </h2>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                aria-describedby={emailError ? "email-error" : undefined}
                aria-invalid={Boolean(emailError)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="email"
                placeholder="name@company.com"
                type="email"
              />
              {emailError ? (
                <span
                  className="mt-1 block text-sm text-status-danger"
                  id="email-error"
                >
                  {emailError}
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
              {isSubmitting ? "Sending..." : "Send Reset Link"}
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

function PageLoading() {
  return <main className="min-h-screen bg-surface" />;
}
