"use client";

import Link from "next/link";
import React from "react";
import {
  resolveProjectUiCapabilities,
  useStoredAuthSession,
} from "@/features/auth";
import { getDeliveryHref } from "@/components/delivery/delivery-views";

export type ProjectWorkspaceTabId =
  | "overview"
  | "planning"
  | "delivery"
  | "govern"
  | "resources"
  | "documents"
  | "today"
  | "execution"
  | "tasks"
  | "raid"
  | "calendar"
  | "ai";

type ProjectWorkspaceTab = {
  href: string;
  id: ProjectWorkspaceTabId;
  label: string;
  /** Hidden unfinished / placeholder destinations stay routable but not listed. */
  visible?: boolean;
};

/**
 * Delivery Operating System project tabs:
 * Overview → Planning → Delivery → Govern → Team → Documents.
 * Legacy Execution / Tasks / Today / RAID routes redirect into Delivery / Govern.
 */
function getProjectWorkspaceTabs(projectId: string): ProjectWorkspaceTab[] {
  const basePath = `/projects/${projectId}`;

  return [
    { href: basePath, id: "overview", label: "Overview" },
    { href: `${basePath}/planning`, id: "planning", label: "Planning" },
    {
      href: getDeliveryHref(projectId, "list"),
      id: "delivery",
      label: "Delivery",
    },
    { href: `${basePath}/govern`, id: "govern", label: "Govern" },
    { href: `${basePath}/team`, id: "resources", label: "Team" },
    { href: `${basePath}/documents`, id: "documents", label: "Documents" },
    // Legacy ids retained for activeTab highlighting during redirects.
    {
      href: getDeliveryHref(projectId, "today"),
      id: "today",
      label: "Today",
      visible: false,
    },
    {
      href: getDeliveryHref(projectId, "list"),
      id: "execution",
      label: "Execution",
      visible: false,
    },
    {
      href: getDeliveryHref(projectId, "list"),
      id: "tasks",
      label: "Tasks",
      visible: false,
    },
    {
      href: `${basePath}/govern`,
      id: "raid",
      label: "RAID",
      visible: false,
    },
    {
      href: `${basePath}/reports`,
      id: "calendar",
      label: "Calendar",
      visible: false,
    },
    {
      href: `${basePath}/reports`,
      id: "ai",
      label: "AI (future)",
      visible: false,
    },
  ];
}

type ProjectTabsProps = {
  activeTab: ProjectWorkspaceTabId;
  projectId: string;
  tabs?: ProjectWorkspaceTab[];
};

export function ProjectTabs({
  activeTab,
  projectId,
  tabs = getProjectWorkspaceTabs(projectId),
}: ProjectTabsProps) {
  const { permissionKeys, roleNames } = useStoredAuthSession();
  const capabilities = resolveProjectUiCapabilities({
    permissionKeys,
    roleNames,
  });
  const visibleTabs = tabs.filter((tab) => {
    if (tab.visible === false) {
      return false;
    }

    if (tab.id === "planning") {
      return capabilities.canAccessPlanning;
    }
    if (tab.id === "delivery") {
      return capabilities.canAccessDelivery;
    }
    if (tab.id === "govern") {
      return capabilities.canAccessGovern;
    }

    return true;
  });

  const resolvedActiveTab =
    activeTab === "execution" ||
    activeTab === "tasks" ||
    activeTab === "today"
      ? "delivery"
      : activeTab === "raid"
        ? "govern"
        : activeTab;

  return (
    <nav
      aria-label="Project workspace"
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <div className="flex min-w-max gap-1 border-b border-slate-200 md:min-w-0 md:flex-wrap">
        {visibleTabs.map((tab) => {
          const isActive = tab.id === resolvedActiveTab;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"
              }`}
              href={tab.href}
              key={tab.id}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
