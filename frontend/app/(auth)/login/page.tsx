"use client";

import React from "react";
import { FormEvent, Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getAuthMe,
  getDefaultDashboardPath,
  login,
  startGoogleOidcLogin,
  storeAuthMe,
  storeSession,
} from "@/features/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const googleAttemptStarted = useRef(false);

  function handleGoogleSignIn() {
    if (googleAttemptStarted.current || isSubmitting) {
      return;
    }

    googleAttemptStarted.current = true;
    setError(null);
    setIsGoogleSubmitting(true);
    startGoogleOidcLogin();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const session = await login(email, password);

      storeSession(session.accessToken, session.refreshToken);
      const authMe = await getAuthMe();
      storeAuthMe(authMe);
      router.push(
        session.requiresPasswordChange ||
          authMe.user.status === "first_login_pending"
          ? "/settings/change-password"
          : getDefaultDashboardPath(authMe),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to authenticate",
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
            Enterprise project delivery in one workspace
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Coordinate portfolios, RAID, tasks, and executive reporting with a
            responsive operating model built for delivery teams.
          </p>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold tracking-normal text-slate-950">
            Sign in
          </h2>

          <button
            className="mt-6 block w-full rounded-md border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isGoogleSubmitting || isSubmitting}
            onClick={handleGoogleSignIn}
            type="button"
          >
            {isGoogleSubmitting
              ? "Redirecting to Google..."
              : "Sign in with Google"}
          </button>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Or
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="email"
                placeholder="name@company.com"
                required
                type="email"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Password
              </span>
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="password"
                placeholder="Enter your password"
                required
                type="password"
              />
            </label>

            <div className="text-right">
              <Link
                className="text-sm font-semibold text-brand transition hover:text-teal-800"
                href="/forgot-password"
              >
                Forgot Password?
              </Link>
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              className="block w-full rounded-md bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || isGoogleSubmitting}
              type="submit"
            >
              {isSubmitting ? "Working..." : "Sign In"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function PageLoading() {
  return <main className="min-h-screen bg-surface" />;
}
