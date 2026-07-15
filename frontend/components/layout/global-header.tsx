import React from "react";
import Link from "next/link";
import type { ApiAuthMe } from "@/features/auth";
import { hasAnyPermission } from "@/features/auth";

type GlobalHeaderProps = {
  onLogout: () => void;
  onOpenNavigation: () => void;
  permissionKeys: string[];
  sessionProfile: ApiAuthMe | null;
};

export function GlobalHeader({
  onLogout,
  onOpenNavigation,
  permissionKeys,
  sessionProfile,
}: GlobalHeaderProps) {
  const canReadNotifications = hasAnyPermission(permissionKeys, [
    "notification.read",
  ]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            aria-label="Open navigation"
            className="grid size-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 lg:hidden"
            onClick={onOpenNavigation}
            type="button"
          >
            Menu
          </button>

          <label className="min-w-0 flex-1 md:max-w-xl">
            <span className="sr-only">Global search</span>
            <input
              aria-describedby="global-search-status"
              className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm outline-none placeholder:text-slate-500 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
              placeholder="Search across PM Platform"
              readOnly
              type="search"
            />
            <span className="sr-only" id="global-search-status">
              Global search is a placeholder for a future sprint.
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {canReadNotifications ? (
            <Link
              className="hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:block"
              href="/notifications"
            >
              Notifications
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="hidden rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-400 sm:block"
              title="Notification access is not available for this role"
            >
              Notifications
            </span>
          )}
          <button
            aria-disabled="true"
            className="hidden cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500 md:block"
            disabled
            title="AI Assistant is a placeholder for a future sprint"
            type="button"
          >
            AI Assistant
          </button>

          <div className="hidden text-right xl:block">
            <p className="max-w-40 truncate text-sm font-medium text-slate-900">
              {getDisplayName(sessionProfile)}
            </p>
            <p className="max-w-40 truncate text-xs text-slate-500">
              {getRoleName(sessionProfile)}
            </p>
          </div>
          <div
            aria-label={`Signed in as ${getDisplayName(sessionProfile)}`}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white"
            role="img"
          >
            {getInitials(sessionProfile)}
          </div>
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function getDisplayName(sessionProfile: ApiAuthMe | null) {
  const firstName = sessionProfile?.user.firstName?.trim() ?? "";
  const lastName = sessionProfile?.user.lastName?.trim() ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || sessionProfile?.user.email || "Signed in user";
}

function getRoleName(sessionProfile: ApiAuthMe | null) {
  return (
    sessionProfile?.user.role?.name ??
    sessionProfile?.roles[0]?.name ??
    "Signed in workspace"
  );
}

function getInitials(sessionProfile: ApiAuthMe | null) {
  const firstName = sessionProfile?.user.firstName?.trim() ?? "";
  const lastName = sessionProfile?.user.lastName?.trim() ?? "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    initials || sessionProfile?.user.email?.slice(0, 2).toUpperCase() || "PM"
  );
}
