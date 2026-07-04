"use client";

import React from "react";
import type { ApiProject } from "@/features/projects";

type ProjectSummaryProps = {
  project: ApiProject;
};

export function ProjectSummary({ project }: ProjectSummaryProps) {
  const items = [
    { label: "Project summary", value: project.description },
    { label: "Status", value: formatLabel(project.health?.status ?? project.status) },
    { label: "Start", value: formatDate(project.startDate) },
    { label: "Finish", value: formatDate(project.targetEndDate) },
    { label: "Project Manager", value: formatUser(project.owner) },
    { label: "Completion", value: formatCompletion(project) },
  ].filter((item) => item.value);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">Project summary</h2>
      {items.length > 0 ? (
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-sm font-medium text-slate-500">
                {item.label}
              </dt>
              <dd className="mt-2 text-sm font-semibold text-slate-950">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Project summary details have not been added yet.
        </p>
      )}
    </section>
  );
}

export function ProjectWorkspacePlaceholder({ title }: { title: string }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">
        This module will be available in an upcoming release.
      </p>
    </section>
  );
}

export function ProjectOverviewPlaceholders() {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <OverviewPlaceholder title="Recent activity" />
      <OverviewPlaceholder title="Recent RAID" />
      <OverviewPlaceholder title="Upcoming milestones" />
    </section>
  );
}

function OverviewPlaceholder({ title }: { title: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">
        This information will appear here when project activity is available.
      </p>
    </article>
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
