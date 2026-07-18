import React from "react";
import Link from "next/link";
import type { ApiAuthMe } from "@/features/auth";
import { hasAnyPermission } from "@/features/auth";

type GlobalHeaderProps = {
  onLogout: () => void;
  onOpenCommandPalette: () => void;
  onOpenNavigation: () => void;
  permissionKeys: string[];
  sessionProfile: ApiAuthMe | null;
};

export function GlobalHeader({
  onLogout,
  onOpenCommandPalette,
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

          <button
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
            className="flex h-9 min-w-0 flex-1 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/80 px-3 text-left text-sm text-slate-600 outline-none transition hover:border-slate-300 hover:bg-white focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 md:max-w-2xl"
            onClick={onOpenCommandPalette}
            type="button"
          >
            <span className="truncate">Search commands and workspaces</span>
            <kbd className="hidden shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-sans text-xs text-slate-500 sm:inline">
              Ctrl/⌘ K
            </kbd>
            <span className="sr-only">Open command palette</span>
          </button>
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
