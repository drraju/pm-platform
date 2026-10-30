"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearSession,
  type ApiAuthMe,
  getAuthMe,
  getLandingPath,
  getStoredPermissionKeys,
  getStoredRoleNames,
  hasAnyPermission,
  storeAuthMe,
} from "@/features/auth";
import { getUnreadNotificationCount } from "@/features/notifications";
import { AppSidebar } from "./app-sidebar";
import { GlobalHeader } from "./global-header";
import { WorkspaceContextBar } from "./workspace-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [sessionProfile, setSessionProfile] = useState<ApiAuthMe | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );
  const [roleNames, setRoleNames] = useState<string[]>(() =>
    getStoredRoleNames(),
  );
  const homeHref = getLandingPath(permissionKeys);
  const canReadNotifications = permissionKeys.includes("notification.read");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSessionProfile() {
      try {
        const authMe = await getAuthMe();
        if (!isMounted) {
          return;
        }
        storeAuthMe(authMe);
        setSessionProfile(authMe);
        setPermissionKeys(
          authMe.permissions.map((permission) => permission.key),
        );
        setRoleNames(authMe.roles.map((role) => role.name));
      } catch {
        if (isMounted) {
          setPermissionKeys(getStoredPermissionKeys());
          setRoleNames(getStoredRoleNames());
        }
      }
    }

    void loadSessionProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!canReadNotifications) {
      return;
    }
    let mounted = true;
    const refresh = () => {
      getUnreadNotificationCount()
        .then((count) => {
          if (mounted) setUnreadNotifications(count);
        })
        .catch(() => {
          if (mounted) setUnreadNotifications(0);
        });
    };
    refresh();
    window.addEventListener("pm-notifications", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("pm-notifications", refresh);
    };
  }, [canReadNotifications, pathname]);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-surface text-ink antialiased">
      <AppSidebar
        homeHref={homeHref}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((value) => !value)}
        pathname={pathname}
        permissionKeys={permissionKeys}
        roleNames={roleNames}
      />

      {isMobileDrawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setIsMobileDrawerOpen(false)}
            type="button"
          />
          <AppSidebar
            homeHref={homeHref}
            isMobile
            onClose={() => setIsMobileDrawerOpen(false)}
            pathname={pathname}
            permissionKeys={permissionKeys}
            roleNames={roleNames}
          />
        </div>
      ) : null}

      <div
        className={`transition-[padding] duration-200 ${
          isSidebarCollapsed ? "lg:pl-[4.5rem]" : "lg:pl-60"
        }`}
      >
        <GlobalHeader
          canSearch={hasAnyPermission(permissionKeys, [
            "customer.read",
            "project.read",
            "work.update",
            "task.update",
          ])}
          homeHref={homeHref}
          notifications={canReadNotifications ? { unread: unreadNotifications } : null}
          onLogout={handleLogout}
          onOpenNavigation={() => setIsMobileDrawerOpen(true)}
          sessionProfile={sessionProfile}
        />
        <WorkspaceContextBar pathname={pathname} />

        <main className="mx-auto w-full max-w-[1800px] px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
          {children}
        </main>
      </div>
    </div>
  );
}
