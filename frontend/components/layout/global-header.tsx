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
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[3.75rem] w-full max-w-[1800px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            aria-label="Open navigation"
            className="grid min-h-10 min-w-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden"
            onClick={onOpenNavigation}
            type="button"
          >
            Menu
          </button>

          <label className="min-w-0 flex-1 md:max-w-2xl">
            <span className="sr-only">Global search</span>
            <input
              aria-describedby="global-search-status"
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
              placeholder="Search projects, tasks, and people"
              readOnly
              type="search"
            />
            <span className="sr-only" id="global-search-status">
              Global search is a placeholder for a future sprint.
            </span>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          {canReadNotifications ? (
            <Link
              className="hidden min-h-9 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
              href="/notifications"
            >
              Notifications
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="hidden min-h-9 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-400 sm:inline-flex"
              title="Notification access is not available for this role"
            >
              Notifications
            </span>
          )}
          <button
            aria-disabled="true"
            className="hidden min-h-9 cursor-not-allowed items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-500 md:inline-flex"
            disabled
            title="AI Assistant is a placeholder for a future sprint"
            type="button"
          >
            AI Assistant
          </button>

          <div className="ml-1 hidden text-right xl:block">
            <p className="max-w-40 truncate text-sm font-medium text-slate-900">
              {getDisplayName(sessionProfile)}
            </p>
            <p className="max-w-40 truncate text-xs leading-5 text-slate-500">
              {getRoleName(sessionProfile)}
            </p>
          </div>
          <div
            aria-label={`Signed in as ${getDisplayName(sessionProfile)}`}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white ring-2 ring-white"
            role="img"
          >
            {getInitials(sessionProfile)}
          </div>
          <button
            className="min-h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
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
