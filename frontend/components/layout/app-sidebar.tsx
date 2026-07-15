import React from "react";
import Link from "next/link";
import { hasAnyPermission } from "@/features/auth";
import {
  appNavigation,
  isNavigationItemActive,
  type AppNavigationItem,
} from "./app-navigation";

type AppSidebarProps = {
  isCollapsed?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  pathname: string;
  permissionKeys: string[];
};

export function AppSidebar({
  isCollapsed = false,
  isMobile = false,
  onClose,
  onToggle,
  pathname,
  permissionKeys,
}: AppSidebarProps) {
  const visibleNavigation = appNavigation.filter((item) =>
    hasAnyPermission(permissionKeys, item.permissions),
  );

  return (
    <aside
      aria-label={isMobile ? "Mobile navigation" : "Application navigation"}
      className={getSidebarClassName({ isCollapsed, isMobile })}
    >
      <div className="flex items-start justify-between gap-3">
        <Link
          aria-label="PM Platform Home"
          className={`block min-w-0 ${isCollapsed ? "text-center" : ""}`}
          href="/dashboard"
          onClick={onClose}
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">
            PM
          </span>
          {isCollapsed ? null : (
            <>
              <span className="mt-1 block text-lg font-semibold text-slate-950">
                PM Platform
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Enterprise workspace
              </span>
            </>
          )}
        </Link>

        {isMobile ? (
          <button
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        ) : (
          <button
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onToggle}
            type="button"
          >
            {isCollapsed ? ">" : "<"}
          </button>
        )}
      </div>

      <nav aria-label="Primary navigation" className="mt-8 space-y-1">
        {visibleNavigation.map((item, index) => {
          const previousItem = visibleNavigation[index - 1];
          const showSection =
            !isCollapsed && item.section !== previousItem?.section;

          return (
            <React.Fragment key={item.label}>
              {showSection ? (
                <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-400 first:pt-0">
                  {item.section}
                </p>
              ) : null}
              <NavigationItem
                isActive={isNavigationItemActive(pathname, item)}
                isCollapsed={isCollapsed}
                item={item}
                onNavigate={onClose}
              />
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
}

function NavigationItem({
  isActive,
  isCollapsed,
  item,
  onNavigate,
}: {
  isActive: boolean;
  isCollapsed: boolean;
  item: AppNavigationItem;
  onNavigate?: () => void;
}) {
  const className = `flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-medium transition ${
    isCollapsed ? "justify-center" : "justify-between gap-3"
  } ${
    isActive
      ? "bg-brand text-white"
      : item.href
        ? "text-slate-700 hover:bg-slate-100 hover:text-ink"
        : "cursor-not-allowed text-slate-400"
  }`;

  if (!item.href) {
    return (
      <span
        aria-disabled="true"
        className={className}
        title={item.unavailableHint}
      >
        <span>{isCollapsed ? item.label.slice(0, 1) : item.label}</span>
        {!isCollapsed ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            Context
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={className}
      href={item.href}
      onClick={onNavigate}
      title={isCollapsed ? item.label : undefined}
    >
      <span>{isCollapsed ? item.label.slice(0, 1) : item.label}</span>
      {!isCollapsed && isActive ? (
        <span aria-hidden="true" className="size-2 rounded-full bg-white" />
      ) : null}
    </Link>
  );
}

function getSidebarClassName({
  isCollapsed,
  isMobile,
}: {
  isCollapsed: boolean;
  isMobile: boolean;
}) {
  if (isMobile) {
    return "relative h-full w-80 max-w-[88vw] overflow-y-auto border-r border-slate-200 bg-white px-5 py-5 shadow-soft";
  }

  return `fixed inset-y-0 left-0 z-30 hidden overflow-y-auto border-r border-slate-200 bg-white py-5 transition-[width] duration-200 lg:block ${
    isCollapsed ? "w-20 px-3" : "w-64 px-5"
  }`;
}
