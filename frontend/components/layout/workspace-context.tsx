"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Breadcrumb = {
  href?: string;
  label: string;
};

type WorkspaceContext = {
  breadcrumbs: Breadcrumb[];
  description: string;
  title: string;
};

export function WorkspaceContextBar({ pathname }: { pathname: string }) {
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setProjectName(sessionStorage.getItem("pm-project-name"));
    read();
    window.addEventListener("pm-project-name", read);
    return () => window.removeEventListener("pm-project-name", read);
  }, [pathname]);

  const context = getWorkspaceContext(pathname, projectName);

  return (
    <div className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-1.5 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
            {context.breadcrumbs.map((breadcrumb, index) => {
              const isCurrent = index === context.breadcrumbs.length - 1;

              return (
                <li
                  className="flex items-center gap-2"
                  key={`${breadcrumb.label}-${index}`}
                >
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {breadcrumb.href && !isCurrent ? (
                    <Link className="hover:text-slate-900" href={breadcrumb.href}>
                      {breadcrumb.label}
                    </Link>
                  ) : (
                    <span aria-current={isCurrent ? "page" : undefined}>
                      {breadcrumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}

export function getWorkspaceContext(pathname: string, projectName?: string | null): WorkspaceContext {
  const segments = pathname.split("/").filter(Boolean);

  if (pathname === "/dashboard") {
    return createContext("Home", "Personal priorities and continuity", [
      { label: "Home" },
    ]);
  }

  if (pathname.startsWith("/portfolio")) {
    return createContext("Portfolio", "Portfolio oversight and decisions", [
      { label: "Portfolio" },
    ]);
  }

  if (pathname.startsWith("/today")) {
    return createContext("Today", "Project execution", [
      { label: "Today" },
    ]);
  }

  if (pathname.startsWith("/daily-review")) {
    return createContext("Today", "Work across projects", [
      { label: "Today" },
    ]);
  }

  if (pathname.startsWith("/programs") || pathname.startsWith("/executive")) {
    return createContext("Programs", "Projects grouped for leadership", [
      { label: "Programs" },
    ]);
  }

  if (pathname.startsWith("/start")) {
    return createContext("Start", "Nothing is open for this account yet", [
      { label: "Start" },
    ]);
  }

  if (pathname.startsWith("/projects/")) {
    const projectId = segments[1];
    const projectRoot = `/projects/${projectId}`;
    const leaf = segments[2];

    if (leaf === "plan" || leaf === "planning") {
      return createContext("Plan", "Schedule for this project", [
        { href: "/projects", label: "Projects" },
        { href: projectRoot, label: projectName || "Project" },
        { label: "Plan" },
      ]);
    }

    if (leaf === "board" || leaf === "kanban") {
      return createContext("Board", "The same work, in four columns", [
        { href: "/projects", label: "Projects" },
        { href: projectRoot, label: projectName || "Project" },
        { label: "Board" },
      ]);
    }

    if (leaf === "delivery") {
      return createContext("Delivery", "Task execution workspace", [
        { href: "/projects", label: "Projects" },
        { href: projectRoot, label: projectName || "Project" },
        { label: "Delivery" },
      ]);
    }

    if (leaf === "govern" || leaf === "raid") {
      return createContext("RAID", "Risks, issues, assumptions, and dependencies", [
        { href: "/projects", label: "Projects" },
        { href: projectRoot, label: projectName || "Project" },
        { label: "RAID" },
      ]);
    }

    const tabLabel = !leaf || leaf === "overview" ? "Overview" : formatSegment(leaf);
    return createContext(tabLabel, "Single-project command center", [
      { href: "/projects", label: "Projects" },
      { href: leaf ? projectRoot : undefined, label: projectName || "Project" },
      { label: tabLabel },
    ]);
  }

  if (pathname.startsWith("/customers")) {
    return createContext("Customers", "Companies you sell to or deliver for", [
      { label: "Customers" },
    ]);
  }

  if (pathname.startsWith("/projects")) {
    return createContext("Projects", "Project discovery and management", [
      { label: "Projects" },
    ]);
  }

  if (pathname.startsWith("/tasks")) {
    return createContext("Today", "Work across projects", [
      { label: "Today" },
    ]);
  }

  if (pathname.startsWith("/risks") || pathname.startsWith("/issues")) {
    const leaf = pathname.startsWith("/risks") ? "Risks" : "Issues";
    return createContext("Projects", "Cross-project RAID queue", [
      { href: "/projects", label: "Projects" },
      { label: leaf },
    ]);
  }

  if (pathname.startsWith("/calendar")) {
    return createContext("Calendars", "Enterprise configuration", [
      { label: "Calendars" },
    ]);
  }

  if (pathname.startsWith("/users")) {
    return createContext("People", "Invite people and assign roles", [
      { label: "Administration" },
      { label: "People" },
    ]);
  }

  if (pathname.startsWith("/notifications")) {
    return createContext("Notifications", "Assignments, blocked work, overdue work, and work that is waiting", [
      { label: "Notifications" },
    ]);
  }

  return createContext("Workspace", "PM Platform", [
    { label: formatSegment(segments.at(-1)) || "Workspace" },
  ]);
}

function createContext(
  title: string,
  description: string,
  breadcrumbs: Breadcrumb[],
): WorkspaceContext {
  return { breadcrumbs, description, title };
}

function formatSegment(value?: string) {
  if (!value) {
    return "";
  }

  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
