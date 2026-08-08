"use client";

import React, { useState } from "react";
import { StatusBadge } from "@/components/foundation";
import { ProjectHealthBadge } from "@/components/projects/project-health-badge";
import type { ApiProject } from "@/features/projects";
import { downloadProjectExcel } from "@/lib/api/client";
import { ProjectTabs, type ProjectWorkspaceTabId } from "./project-tabs";

interface ProjectHeaderContent {
  actions?: React.ReactNode;
  eyebrow?: string;
  metadata: Array<{ id: string; label: string; value: React.ReactNode }>;
  navigation: React.ReactNode;
  status?: React.ReactNode;
  subtitle?: React.ReactNode;
  title: React.ReactNode;
}

export type ProjectHeaderRenderer = (
  content: ProjectHeaderContent,
) => React.ReactNode;

type ProjectHeaderProps = {
  activeTab: ProjectWorkspaceTabId;
  project: ApiProject;
  render?: ProjectHeaderRenderer;
};

export function ProjectHeader({
  activeTab,
  project,
  render,
}: ProjectHeaderProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function exportProject() {
    setIsExporting(true);
    try {
      const blob = await downloadProjectExcel(project.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "project"}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }

  const metadata = [
    { label: "Project Manager", value: formatUser(project.owner) },
    { label: "Finish", value: formatDate(project.targetEndDate) },
  ].filter((item) => item.value);

  const status = project.health ? (
    <ProjectHealthBadge
      reasons={project.health.reasons}
      status={project.health.status}
    />
  ) : (
    <StatusBadge tone="neutral">{formatLabel(project.status) ?? "Active"}</StatusBadge>
  );

  const actions = (
    <button
      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      disabled={isExporting}
      onClick={() => void exportProject()}
      type="button"
    >
      {isExporting ? "Exporting..." : "Export Excel"}
    </button>
  );

  const content: ProjectHeaderContent = {
    actions,
    metadata: metadata.map((item) => ({
      id: item.label.toLowerCase().replaceAll(" ", "-"),
      label: item.label,
      value: item.value,
    })),
    navigation: <ProjectTabs activeTab={activeTab} projectId={project.id} />,
    status,
    title: project.name,
  };

  if (render) {
    return render(content);
  }

  return (
    <header className="overflow-hidden rounded-ui border border-ui-border bg-ui-surface shadow-ui-subtle">
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-slate-950">
              {project.name}
            </h1>
            {status}
          </div>
          {metadata.length > 0 ? (
            <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {metadata.map((item) => (
                <div className="flex min-w-0 items-baseline gap-1" key={item.label}>
                  <dt className="font-medium text-slate-500">{item.label}</dt>
                  <dd className="truncate font-semibold text-slate-800">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <div className="shrink-0">{actions}</div>
      </div>
      <div className="px-4">
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
