"use client";

import Link from "next/link";
import React from "react";

export type ProjectWorkspaceTabId =
  | "overview"
  | "planning"
  | "tasks"
  | "raid"
  | "team"
  | "documents"
  | "reports";

type ProjectWorkspaceTab = {
  href: string;
  id: ProjectWorkspaceTabId;
  label: string;
};

function getProjectWorkspaceTabs(projectId: string): ProjectWorkspaceTab[] {
  const basePath = `/projects/${projectId}`;

  return [
    { href: basePath, id: "overview", label: "Overview" },
    { href: `${basePath}/planning`, id: "planning", label: "Planning" },
    { href: `${basePath}/tasks`, id: "tasks", label: "Tasks" },
    { href: `${basePath}/raid`, id: "raid", label: "RAID" },
    { href: `${basePath}/team`, id: "team", label: "Team" },
    { href: `${basePath}/documents`, id: "documents", label: "Documents" },
    { href: `${basePath}/reports`, id: "reports", label: "Reports" },
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
  return (
    <nav
      aria-label="Project workspace"
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <div className="flex min-w-max gap-1 border-b border-slate-200 md:min-w-0 md:flex-wrap">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand/30 ${
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
