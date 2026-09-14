"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import {
  clearSession,
  exchangeGoogleOidcHandoff,
  getAuthMe,
  getDefaultDashboardPath,
  storeAuthMe,
  storeSession,
} from "@/features/auth";

const handoffPattern = /^[A-Za-z0-9_-]{43}$/;

const googleErrorMessages = {
  access_denied:
    "Google sign-in was cancelled or access was denied. Please try again.",
  authentication_failed:
    "We could not complete Google sign-in. Please try again.",
  invalid_request: "This sign-in request is invalid. Please try again.",
  transaction_expired: "This sign-in attempt has expired. Please try again.",
} as const;

type GoogleErrorCategory = keyof typeof googleErrorMessages;

function isGoogleErrorCategory(value: string): value is GoogleErrorCategory {
  return Object.prototype.hasOwnProperty.call(googleErrorMessages, value);
}

export default function GoogleOidcCallbackPage() {
  const router = useRouter();
  const exchangeStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (exchangeStarted.current) {
      return;
    }
    exchangeStarted.current = true;

    const query = new URLSearchParams(window.location.search);
    const handoffs = query.getAll("handoff");
    const errors = query.getAll("error");

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.hash}`,
    );

    if (errors.length === 1 && handoffs.length === 0) {
      const category = errors[0];
      setError(
        isGoogleErrorCategory(category)
          ? googleErrorMessages[category]
          : googleErrorMessages.authentication_failed,
      );
      return;
    }

    if (
      handoffs.length !== 1 ||
      errors.length !== 0 ||
      !handoffPattern.test(handoffs[0])
    ) {
      setError(googleErrorMessages.invalid_request);
      return;
    }

    async function completeSignIn(handoff: string) {
      try {
        const session = await exchangeGoogleOidcHandoff(handoff);
        storeSession(session.accessToken, session.refreshToken);

        const authMe = await getAuthMe();
        storeAuthMe(authMe);
        router.push(
          session.requiresPasswordChange ||
            authMe.user.status === "first_login_pending"
            ? "/settings/change-password"
            : getDefaultDashboardPath(authMe),
        );
      } catch {
        try {
          clearSession();
        } finally {
          setError(googleErrorMessages.authentication_failed);
        }
      }
    }

    void completeSignIn(handoffs[0]);
  }, [router]);

  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <section className="w-full rounded-md border border-slate-200 bg-white p-6 text-center shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            PM Platform
          </p>
          <h1 className="mt-4 text-xl font-semibold tracking-normal text-slate-950">
            {error ? "Sign-in could not be completed" : "Completing sign-in..."}
          </h1>
          <p
            className={`mt-3 text-sm leading-6 ${error ? "text-red-700" : "text-slate-600"}`}
          >
            {error
              ? error
              : "Please wait while we securely finish signing you in."}
          </p>
          {error ? (
            <Link
              className="mt-6 inline-block rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
              href="/login"
            >
              Back to sign in
            </Link>
          ) : null}
        </section>
      </div>
    </main>
  );
}
