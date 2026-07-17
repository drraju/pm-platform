"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearSession,
  type ApiAuthMe,
  getAuthMe,
  getStoredPermissionKeys,
  storeAuthMe,
} from "@/features/auth";
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
      } catch {
        if (isMounted) {
          setPermissionKeys(getStoredPermissionKeys());
        }
      }
    }

    void loadSessionProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-surface text-ink antialiased">
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((value) => !value)}
        pathname={pathname}
        permissionKeys={permissionKeys}
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
            isMobile
            onClose={() => setIsMobileDrawerOpen(false)}
            pathname={pathname}
            permissionKeys={permissionKeys}
          />
        </div>
      ) : null}

      <div
        className={`transition-[padding] duration-200 ${
          isSidebarCollapsed ? "lg:pl-[4.5rem]" : "lg:pl-60"
        }`}
      >
        <GlobalHeader
          onLogout={handleLogout}
          onOpenNavigation={() => setIsMobileDrawerOpen(true)}
          permissionKeys={permissionKeys}
          sessionProfile={sessionProfile}
        />
        <WorkspaceContextBar pathname={pathname} />

        <main className="mx-auto w-full max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
