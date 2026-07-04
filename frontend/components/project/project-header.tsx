"use client";

import React from "react";
import type { ApiProject } from "@/features/projects";
import { ProjectTabs, type ProjectWorkspaceTabId } from "./project-tabs";

type ProjectHeaderProps = {
  activeTab: ProjectWorkspaceTabId;
  project: ApiProject;
};

export function ProjectHeader({ activeTab, project }: ProjectHeaderProps) {
  const metadata = [
    { label: "Status", value: formatLabel(project.health?.status ?? project.status) },
    { label: "Project Manager", value: formatUser(project.owner) },
    { label: "Start", value: formatDate(project.startDate) },
    { label: "Finish", value: formatDate(project.targetEndDate) },
    { label: "Completion", value: formatCompletion(project) },
  ].filter((item) => item.value);

  return (
    <header className="rounded-md border border-slate-200 bg-white shadow-soft">
      <div className="space-y-4 px-4 py-5 sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project Workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            {project.name}
          </h1>
          {project.description ? (
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {project.description}
            </p>
          ) : null}
        </div>

        {metadata.length > 0 ? (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {metadata.map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      <div className="px-4 sm:px-5">
        <ProjectTabs activeTab={activeTab} projectId={project.id} />
      </div>
    </header>
  );
}

function formatUser(user?: ApiProject["owner"]) {
  if (!user) {
    return null;
  }

  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : null;
}

function formatCompletion(project: ApiProject) {
  const tasks = project.tasks ?? [];

  if (tasks.length === 0) {
    return "0%";
  }

  const totalCompletion = tasks.reduce(
    (sum, task) => sum + (task.percentComplete ?? (task.status === "done" ? 100 : 0)),
    0,
  );

  return `${Math.round(totalCompletion / tasks.length)}%`;
}
