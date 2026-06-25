"use client";

import React from "react";
import { FormEvent, Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuthMe,
  getDefaultDashboardPath,
  login,
  register,
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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const session =
        mode === "login"
          ? await login(email, password)
          : await register({
              email,
              password,
              firstName: String(formData.get("firstName") ?? ""),
              lastName: String(formData.get("lastName") ?? ""),
            });

      storeSession(session.accessToken, session.refreshToken);
      const authMe = await getAuthMe();
      storeAuthMe(authMe);
      router.push(getDefaultDashboardPath(authMe));
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
          <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${
                  mode === item
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600"
                }`}
                key={item}
                onClick={() => setMode(item)}
                type="button"
              >
                {item === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    First name
                  </span>
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    name="firstName"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Last name
                  </span>
                  <input
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    name="lastName"
                    required
                  />
                </label>
              </div>
            ) : null}

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
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                minLength={mode === "register" ? 8 : undefined}
                name="password"
                placeholder={
                  mode === "register"
                    ? "Enter at least 8 characters"
                    : "Enter your password"
                }
                required
                type="password"
              />
            </label>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              className="block w-full rounded-md bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Working..."
                : mode === "login"
                  ? "Continue"
                  : "Create account"}
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
