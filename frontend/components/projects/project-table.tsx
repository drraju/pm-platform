"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { ApiProject } from "@/features/projects";

type ProjectTableProps = {
  canArchiveProjects?: boolean;
  canDeleteProjects?: boolean;
  canEditProjects?: boolean;
  canPurgeProjects?: boolean;
  canRestoreProjects?: boolean;
  emptyMessage: string;
  isLoading: boolean;
  onArchiveProject?: (project: ApiProject) => void;
  onDeleteProject?: (project: ApiProject) => void;
  onEditProject?: (project: ApiProject) => void;
  onPurgeProject?: (project: ApiProject) => void;
  onRestoreProject?: (project: ApiProject) => void;
  projects: ApiProject[];
};

export function ProjectTable({
  canArchiveProjects,
  canDeleteProjects = false,
  canEditProjects = false,
  canPurgeProjects = false,
  canRestoreProjects = false,
  emptyMessage,
  isLoading,
  onArchiveProject,
  onDeleteProject,
  onEditProject,
  onPurgeProject,
  onRestoreProject,
  projects,
}: ProjectTableProps) {
  const router = useRouter();

  function openProject(projectId: string) {
    router.push(`/projects/${projectId}`);
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_6rem_7rem_auto] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
        <span>Name</span>
        <span>Customer</span>
        <span>Lead</span>
        <span>Status</span>
        <span>Finish</span>
        <span className="sr-only">Actions</span>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <p className="px-3 py-4 text-sm text-slate-500">
            Loading projects...
          </p>
        ) : null}

        {!isLoading && projects.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">{emptyMessage}</p>
        ) : null}

        {projects.map((project) => (
          <article
            aria-label={`Open ${project.name}`}
            className="grid cursor-pointer gap-2 px-3 py-2.5 text-sm transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/30 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_6rem_7rem_auto] md:items-center"
            key={project.id}
            onClick={() => openProject(project.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                openProject(project.id);
              }
            }}
            role="link"
            tabIndex={0}
          >
            <div className="min-w-0">
              <span className="block truncate font-semibold text-slate-950">
                {project.name}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 md:hidden">
                {project.customer?.name ?? "No customer"} · {leadName(project)}
              </span>
            </div>
            <span className="hidden text-slate-700 md:block">{project.customer?.name ?? "—"}</span>
            <span className="hidden text-slate-700 md:block">{leadName(project)}</span>
            <span className="hidden text-slate-700 md:block">{formatStatus(project.status)}</span>
            <span className="hidden text-slate-700 md:block">{formatFinish(project.targetEndDate)}</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                className="w-fit rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/30"
                onClick={(event) => {
                  event.stopPropagation();
                  openProject(project.id);
                }}
                type="button"
              >
                Open
              </button>
              {canEditProjects && onEditProject ? (
                <button
                  className="w-fit rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditProject(project);
                  }}
                  type="button"
                >
                  Edit
                </button>
              ) : null}
              {(canArchiveProjects ?? canDeleteProjects) &&
              (onArchiveProject ?? onDeleteProject) &&
              project.status !== "archived" ? (
                <button
                  className="w-fit rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300/40"
                  onClick={(event) => {
                    event.stopPropagation();
                    (onArchiveProject ?? onDeleteProject)?.(project);
                  }}
                  type="button"
                >
                  Archive
                </button>
              ) : null}
              {canRestoreProjects &&
              onRestoreProject &&
              project.status === "archived" ? (
                <button
                  className="w-fit rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRestoreProject(project);
                  }}
                  type="button"
                >
                  Restore
                </button>
              ) : null}
              {canPurgeProjects &&
              onPurgeProject &&
              project.status === "archived" ? (
                <button
                  className="w-fit rounded border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300/40"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPurgeProject(project);
                  }}
                  type="button"
                >
                  Purge
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function leadName(project: ApiProject) {
  const lead = project.owner;
  const name = [lead?.firstName, lead?.lastName].filter(Boolean).join(" ").trim();
  return name || lead?.email || "—";
}

function formatStatus(value: string) {
  const labels: Record<string, string> = {
    active: "Active",
    done: "Done",
    paused: "Paused",
    planned: "Planned",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function formatFinish(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}
