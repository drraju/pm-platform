import React from "react";
import Link from "next/link";
import type { ApiAuthMe } from "@/features/auth";
import { HeaderSearch } from "./header-search";

type GlobalHeaderProps = {
  canSearch?: boolean;
  homeHref: string;
  notifications?: { unread: number } | null;
  onLogout: () => void;
  onOpenNavigation: () => void;
  sessionProfile: ApiAuthMe | null;
};

export function GlobalHeader({
  canSearch = false,
  homeHref,
  notifications,
  onLogout,
  onOpenNavigation,
  sessionProfile,
}: GlobalHeaderProps) {
  const displayName = sessionProfile ? getDisplayName(sessionProfile) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[3.75rem] w-full max-w-[1800px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Open navigation"
            className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden"
            onClick={onOpenNavigation}
            type="button"
          >
            Menu
          </button>
          <Link
            className="truncate text-sm font-semibold tracking-tight text-slate-950"
            href={homeHref}
          >
            PM Platform
          </Link>
        </div>

        {canSearch ? (
          <div className="order-last w-full min-w-0 sm:order-none sm:flex-1">
            <HeaderSearch />
          </div>
        ) : (
          <div className="hidden flex-1 sm:block" />
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {notifications ? (
            <Link
              className="inline-flex min-h-9 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              href="/notifications"
            >
              {notifications.unread > 0
                ? `Notifications, ${notifications.unread} unread`
                : "Notifications"}
            </Link>
          ) : null}
          <Link
            className="hidden min-h-9 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
            href="/settings/change-password"
          >
            Settings
          </Link>

          {displayName ? (
            <div className="ml-1 hidden text-right lg:block">
              <p className="max-w-48 truncate text-sm font-medium text-slate-900">
                {displayName}
              </p>
            </div>
          ) : null}
          {displayName ? (
            <div
              aria-label={`Signed in as ${displayName}`}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white ring-2 ring-white"
              role="img"
            >
              {getInitials(sessionProfile)}
            </div>
          ) : null}
          <button
            className="min-h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
            onClick={onLogout}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function getDisplayName(sessionProfile: ApiAuthMe) {
  const firstName = sessionProfile.user.firstName?.trim() ?? "";
  const lastName = sessionProfile.user.lastName?.trim() ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || sessionProfile.user.email;
}

function getInitials(sessionProfile: ApiAuthMe | null) {
  const firstName = sessionProfile?.user.firstName?.trim() ?? "";
  const lastName = sessionProfile?.user.lastName?.trim() ?? "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return initials || sessionProfile?.user.email?.slice(0, 2).toUpperCase() || "";
}
