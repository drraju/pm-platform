"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CommandPalette,
  createApplicationCommandRegistry,
} from "@/features/commands";
import {
  clearSession,
  type ApiAuthMe,
  getAuthMe,
  getStoredPermissionKeys,
  getStoredRoleNames,
  storeAuthMe,
} from "@/features/auth";
import {
  createApplicationEntityRegistry,
  EntityPresentationCatalog,
  EntityRegistryProvider,
} from "@/features/entity-search";
import { AppSidebar } from "./app-sidebar";
import { GlobalHeader } from "./global-header";
import { WorkspaceContextBar } from "./workspace-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [sessionProfile, setSessionProfile] = useState<ApiAuthMe | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );
  const [roleNames, setRoleNames] = useState<string[]>(() =>
    getStoredRoleNames(),
  );
  const commandRegistry = useMemo(
    () => createApplicationCommandRegistry({ pathname, permissionKeys }),
    [pathname, permissionKeys],
  );
  const { entityPresentationCatalog, entityRegistry } = useMemo(
    () => ({
      entityPresentationCatalog: new EntityPresentationCatalog(),
      entityRegistry: createApplicationEntityRegistry({
        pathname,
        permissionKeys,
      }),
    }),
    [pathname, permissionKeys],
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
    function handleCommandPaletteShortcut(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() === "k" &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey
      ) {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    }

    document.addEventListener("keydown", handleCommandPaletteShortcut);
    return () =>
      document.removeEventListener("keydown", handleCommandPaletteShortcut);
  }, []);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <EntityRegistryProvider
      presentationCatalog={entityPresentationCatalog}
      registry={entityRegistry}
    >
      <div className="min-h-screen bg-surface text-ink antialiased">
        <AppSidebar
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
            onLogout={handleLogout}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenNavigation={() => setIsMobileDrawerOpen(true)}
            permissionKeys={permissionKeys}
            sessionProfile={sessionProfile}
          />
          <WorkspaceContextBar pathname={pathname} />

          <main className="mx-auto w-full max-w-[1800px] px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
            {children}
          </main>
        </div>

        <CommandPalette
          entityPresentationCatalog={entityPresentationCatalog}
          entityRegistry={entityRegistry}
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={(target) => router.push(target)}
          registry={commandRegistry}
        />
      </div>
    </EntityRegistryProvider>
  );
}
