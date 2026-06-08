"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, useAuthorization } from "@/features/auth";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    permissions: ["dashboard:read:self"],
  },
  {
    label: "Executive",
    href: "/executive",
    permissions: ["executive:summary:read"],
  },
  {
    label: "Portfolio",
    href: "/portfolio",
    permissions: ["portfolio:summary:read"],
  },
  {
    label: "Projects",
    href: "/projects",
    permissions: ["projects:read:all", "projects:read:assigned"],
  },
  { label: "My Tasks", href: "/tasks", permissions: ["dashboard:read:self"] },
  {
    label: "Risks",
    href: "/risks",
    permissions: ["raid:read:all", "raid:read:assigned"],
  },
  {
    label: "Issues",
    href: "/issues",
    permissions: ["raid:read:all", "raid:read:assigned"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    permissions: ["dashboard:read:self"],
  },
  {
    label: "Admin",
    href: "/admin",
    permissions: ["users:manage", "roles:manage"],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasAnyPermission, isLoading: isLoadingAuthorization } =
    useAuthorization();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const visibleNavigation = isLoadingAuthorization
    ? navigationItems.filter((item) => item.href === "/dashboard")
    : navigationItems.filter((item) => hasAnyPermission(item.permissions));

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <DesktopSidebar
        isCollapsed={isSidebarCollapsed}
        navigation={visibleNavigation}
        onToggle={() => setIsSidebarCollapsed((value) => !value)}
        pathname={pathname}
      />

      {isMobileDrawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setIsMobileDrawerOpen(false)}
            type="button"
          />
          <MobileSidebar
            navigation={visibleNavigation}
            onNavigate={() => setIsMobileDrawerOpen(false)}
            pathname={pathname}
          />
        </div>
      ) : null}

      <div
        className={`transition-[padding] duration-200 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                aria-label="Open navigation"
                className="grid size-10 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-lg font-semibold text-slate-700 lg:hidden"
                onClick={() => setIsMobileDrawerOpen(true)}
                type="button"
              >
                =
              </button>
              <label className="min-w-0 flex-1 md:max-w-xl">
                <span className="sr-only">Global Search</span>
                <input
                  className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/20"
                  placeholder="Search projects, tasks, risks, issues..."
                  type="search"
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">
                  User Profile
                </p>
                <p className="text-xs text-slate-500">Signed in workspace</p>
              </div>
              <div className="grid size-10 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
                UP
              </div>
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function DesktopSidebar({
  isCollapsed,
  navigation,
  onToggle,
  pathname,
}: {
  isCollapsed: boolean;
  navigation: typeof navigationItems;
  onToggle: () => void;
  pathname: string;
}) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white py-6 transition-[width] duration-200 lg:block ${
        isCollapsed ? "w-20 px-3" : "w-64 px-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          aria-label="PM Platform dashboard"
          className={`block min-w-0 ${isCollapsed ? "text-center" : ""}`}
          href="/dashboard"
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">
            PM
          </span>
          {isCollapsed ? null : (
            <span className="mt-2 block text-xl font-semibold">
              Command Center
            </span>
          )}
        </Link>
        <button
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid size-9 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={onToggle}
          type="button"
        >
          {isCollapsed ? ">" : "<"}
        </button>
      </div>

      <NavigationLinks
        isCollapsed={isCollapsed}
        navigation={navigation}
        pathname={pathname}
      />
    </aside>
  );
}

function MobileSidebar({
  navigation,
  onNavigate,
  pathname,
}: {
  navigation: typeof navigationItems;
  onNavigate: () => void;
  pathname: string;
}) {
  return (
    <aside className="relative h-full w-80 max-w-[85vw] border-r border-slate-200 bg-white px-5 py-6 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <Link className="block" href="/dashboard" onClick={onNavigate}>
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">
            PM Platform
          </span>
          <span className="mt-2 block text-xl font-semibold">
            Command Center
          </span>
        </Link>
        <button
          aria-label="Close navigation"
          className="grid size-9 place-items-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700"
          onClick={onNavigate}
          type="button"
        >
          x
        </button>
      </div>

      <NavigationLinks
        navigation={navigation}
        onNavigate={onNavigate}
        pathname={pathname}
      />
    </aside>
  );
}

function NavigationLinks({
  isCollapsed = false,
  navigation,
  onNavigate,
  pathname,
}: {
  isCollapsed?: boolean;
  navigation: typeof navigationItems;
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <nav aria-label="Primary navigation" className="mt-10 space-y-1">
      {navigation.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition ${
              isCollapsed ? "justify-center" : "justify-between gap-3"
            } ${
              isActive
                ? "bg-brand text-white"
                : "text-slate-700 hover:bg-slate-100 hover:text-ink"
            }`}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
            title={isCollapsed ? item.label : undefined}
          >
            <span>{isCollapsed ? item.label.slice(0, 1) : item.label}</span>
            {!isCollapsed && isActive ? (
              <span className="size-2 rounded-full bg-white" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
