import React from "react";
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
  const context = getWorkspaceContext(pathname);

  return (
    <div className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-2.5 sm:px-6 lg:px-8">
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
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p
            aria-label={`Current workspace: ${context.title}`}
            className="text-base font-semibold tracking-tight text-slate-950"
          >
            {context.title}
          </p>
          <p className="text-sm text-slate-500">{context.description}</p>
        </div>
      </div>
    </div>
  );
}

export function getWorkspaceContext(pathname: string): WorkspaceContext {
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

  if (pathname.startsWith("/executive")) {
    return createContext("Intelligence", "Cross-project insight", [
      { label: "Intelligence" },
      { label: "Executive overview" },
    ]);
  }

  if (pathname.startsWith("/projects/")) {
    const projectId = segments[1];
    const projectRoot = `/projects/${projectId}`;
    const leaf = segments[2];

    if (leaf === "planning") {
      return createContext("Planning", "Project plan authoring and analysis", [
        { href: "/projects", label: "Projects" },
        { href: projectRoot, label: "Project" },
        { label: "Planning" },
      ]);
    }

    return createContext("Project", "Single-project command center", [
      { href: "/projects", label: "Projects" },
      ...(leaf ? [{ href: projectRoot, label: "Project" }] : []),
      { label: formatSegment(leaf) || "Overview" },
    ]);
  }

  if (pathname.startsWith("/projects")) {
    return createContext("Projects", "Project discovery and management", [
      { label: "Projects" },
    ]);
  }

  if (pathname.startsWith("/tasks")) {
    return createContext("Projects", "Personal delivery queue", [
      { href: "/projects", label: "Projects" },
      { label: "My Tasks" },
    ]);
  }

  if (pathname.startsWith("/risks") || pathname.startsWith("/issues")) {
    const leaf = pathname.startsWith("/risks") ? "Risks" : "Issues";
    return createContext("Projects", "Cross-project RAID queue", [
      { href: "/projects", label: "Projects" },
      { label: leaf },
    ]);
  }

  if (pathname.startsWith("/calendar") || pathname.startsWith("/users")) {
    const leaf = pathname.startsWith("/calendar")
      ? "Enterprise Calendars"
      : "User Administration";
    return createContext("Administration", "Enterprise configuration", [
      { label: "Administration" },
      { label: leaf },
    ]);
  }

  if (pathname.startsWith("/notifications")) {
    return createContext("Home", "User attention and updates", [
      { href: "/dashboard", label: "Home" },
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
