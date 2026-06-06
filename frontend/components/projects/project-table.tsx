import React from "react";
import Link from "next/link";
import type { ApiProject } from "@/features/projects";

type ProjectTableProps = {
  emptyMessage: string;
  isLoading: boolean;
  projects: ApiProject[];
};

export function ProjectTable({
  emptyMessage,
  isLoading,
  projects,
}: ProjectTableProps) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
      <div className="hidden grid-cols-[1.3fr_0.7fr_1fr_0.7fr_0.8fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
        <span>Name</span>
        <span>Status</span>
        <span>Owner</span>
        <span>Team</span>
        <span>Created</span>
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
          <Link
            className="grid gap-3 px-4 py-4 text-sm transition hover:bg-slate-50 md:grid-cols-[1.3fr_0.7fr_1fr_0.7fr_0.8fr] md:items-center"
            href={`/projects/${project.id}`}
            key={project.id}
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
          </Link>
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
