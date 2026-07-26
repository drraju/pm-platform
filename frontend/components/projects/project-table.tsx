"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ProjectHealthBadge,
  ProjectHealthReasons,
} from "@/components/projects/project-health-badge";
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
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
      <div className="hidden grid-cols-[1.3fr_0.7fr_0.7fr_1fr_0.7fr_0.8fr_180px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
        <span>Name</span>
        <span>Status</span>
        <span>Health</span>
        <span>Owner</span>
        <span>Team</span>
        <span>Created</span>
        <span>Action</span>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Loading projects...
          </p>
        ) : null}

        {!isLoading && projects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">{emptyMessage}</p>
        ) : null}

        {projects.map((project) => (
          <article
            aria-label={`Open ${project.name}`}
            className="grid cursor-pointer gap-3 px-4 py-4 text-sm transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/30 md:grid-cols-[1.3fr_0.7fr_0.7fr_1fr_0.7fr_0.8fr_180px] md:items-center"
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
            <div>
              <span className="block font-semibold text-slate-950">
                {project.name}
              </span>
              <span className="mt-1 block text-slate-500 md:hidden">
                Created {formatDate(project.createdAt)}
              </span>
            </div>
            <span className="capitalize text-slate-700">
              <span className="font-medium text-slate-500 md:hidden">
                Status:{" "}
              </span>
              {formatLabel(project.status)}
            </span>
            <span>
              <span className="mb-1 block font-medium text-slate-500 md:hidden">
                Health
              </span>
              <ProjectHealthBadge
                reasons={project.health?.reasons}
                status={project.health?.status ?? "GREEN"}
              />
              <ProjectHealthReasons reasons={project.health?.reasons} />
            </span>
            <span className="text-slate-600">
              <span className="font-medium text-slate-500 md:hidden">
                Owner:{" "}
              </span>
              {project.owner
                ? `${project.owner.firstName} ${project.owner.lastName}`
                : "Unassigned"}
            </span>
            <span className="text-slate-600">
              <span className="font-medium text-slate-500 md:hidden">
                Team:{" "}
              </span>
              {project.members?.length ?? 0}
            </span>
            <span className="hidden text-slate-600 md:block">
              {formatDate(project.createdAt)}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                className="w-fit rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/30"
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
                  className="w-fit rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/30"
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
                  className="w-fit rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300/40"
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
                  className="w-fit rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/30"
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
                  className="w-fit rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300/40"
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

function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}
