"use client";

import React from "react";
import { SectionCard } from "@/components/ui/card";
import { ContentGrid } from "@/components/ui/content-grid";
import { SectionHeader } from "@/components/ui/section-header";
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
    <SectionCard>
      <SectionHeader title="Project summary" />
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
    </SectionCard>
  );
}

export function ProjectWorkspacePlaceholder({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <SectionCard>
      <SectionHeader title={title} />
      <p className="mt-2 inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Coming in Future Release
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {description ??
          "This workspace module is reserved for a future release and is intentionally read-only for now."}
      </p>
    </SectionCard>
  );
}

export function ProjectOverviewPlaceholders() {
  return (
    <ContentGrid columns={3} gap={4}>
      <OverviewPlaceholder title="Recent activity" />
      <OverviewPlaceholder title="Recent RAID" />
      <OverviewPlaceholder title="Upcoming milestones" />
    </ContentGrid>
  );
}

function OverviewPlaceholder({ title }: { title: string }) {
  return (
    <SectionCard as="article">
      <SectionHeader title={title} />
      <p className="mt-2 text-sm text-slate-500">
        This information will appear here when project activity is available.
      </p>
    </SectionCard>
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
