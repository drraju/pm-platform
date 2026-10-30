"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  getAuthMe,
  getDefaultDashboardPath,
  holdingExplanation,
  storeAuthMe,
} from "@/features/auth";

export default function StartPage() {
  const router = useRouter();
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function resolveLanding() {
      try {
        const authMe = await getAuthMe();
        if (!isMounted) {
          return;
        }
        storeAuthMe(authMe);
        const landingPath = getDefaultDashboardPath(authMe);
        if (landingPath !== "/start") {
          router.replace(landingPath);
          return;
        }
        setExplanation(
          holdingExplanation(authMe.permissions.map((permission) => permission.key)),
        );
      } catch {
        if (isMounted) {
          router.replace("/login");
        }
      }
    }

    void resolveLanding();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function handleSignOut() {
    clearSession();
    router.push("/login");
  }

  if (!explanation) {
    return null;
  }

  return (
    <section className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
        Nothing to open yet
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {explanation} Sign out if this is the wrong account.
      </p>
      <button
        className="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        onClick={handleSignOut}
        type="button"
      >
        Sign out
      </button>
    </section>
  );
}
