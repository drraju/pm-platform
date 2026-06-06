"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  ProjectHealthBadge,
  ProjectHealthFactors,
} from "@/components/projects/project-health-badge";
import { ProjectWorkspaceOverview } from "@/components/projects/project-workspace-overview";
import {
  formatRaidLabel,
  formatRaidOwner,
  ProjectWorkspaceRegisterSection,
} from "@/components/projects/project-workspace-register-section";
import { ProjectWorkspaceSummary } from "@/components/projects/project-workspace-summary";
import { ProjectWorkspaceTeam } from "@/components/projects/project-workspace-team";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import {
  getProject,
  getProjectAssumptions,
  getProjectDependencies,
  getProjectIssues,
  getProjectRisks,
  type ApiProjectDetails,
} from "@/features/projects";

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      setError(null);
      setIsLoading(true);
      try {
        const [
          projectDetails,
          risks,
          issues,
          assumptions,
          dependencies,
        ] = await Promise.all([
          getProject(projectId),
          getProjectRisks(projectId),
          getProjectIssues(projectId),
          getProjectAssumptions(projectId),
          getProjectDependencies(projectId),
        ]);

        setProject({
          ...projectDetails,
          assumptions,
          dependencies,
          issues,
          risks,
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load project",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="Loading project workspace details."
          eyebrow="Project workspace"
          title="Project"
        />
        <ProjectWorkspaceLoadingState />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader
          description="The requested project workspace could not be loaded."
          eyebrow="Project workspace"
          title="Project not found"
        />
        {error ? <ErrorMessage message={error} /> : null}
        <Link className="text-sm font-semibold text-brand" href="/projects">
          Back to projects
        </Link>
      </div>
    );
  }

  const members = project.members ?? [];
  const tasks = project.tasks ?? [];
  const risks = project.risks ?? [];
  const issues = project.issues ?? [];
  const assumptions = project.assumptions ?? [];
  const dependencies = project.dependencies ?? [];
  const health = project.health ?? {
    factors: ['No critical issues, high risks, or overdue task threshold breaches'],
    status: "GREEN" as const,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description={project.description || "No project description has been added."}
        eyebrow="Project workspace"
        title={project.name}
      />

      {error ? <ErrorMessage message={error} /> : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Delivery Health
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Calculated from open critical issues, high risks, and overdue task percentage.
            </p>
          </div>
          <div>
            <ProjectHealthBadge status={health.status} />
            <ProjectHealthFactors factors={health.factors} />
          </div>
        </div>
      </section>

      <ProjectWorkspaceOverview project={project} />
      <ProjectWorkspaceSummary tasks={tasks} />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ProjectWorkspaceTeam members={members} />
        <ProjectWorkspaceTasks tasks={tasks} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (risk) => risk.title },
            {
              header: "Severity",
              render: (risk) => formatRaidLabel(risk.severity ?? risk.impact),
            },
            { header: "Owner", render: formatRaidOwner },
            { header: "Status", render: (risk) => formatRaidLabel(risk.status) },
          ]}
          description="Project risks with ownership and current status."
          emptyMessage="No risks yet."
          items={risks}
          title="Risks"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (issue) => issue.title },
            {
              header: "Priority",
              render: (issue) => formatRaidLabel(issue.priority ?? issue.severity),
            },
            { header: "Owner", render: formatRaidOwner },
            {
              header: "Status",
              render: (issue) => formatRaidLabel(issue.status),
            },
          ]}
          description="Open and tracked issues affecting delivery."
          emptyMessage="No issues yet."
          items={issues}
          title="Issues"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (assumption) => assumption.title },
            { header: "Owner", render: formatRaidOwner },
            {
              header: "Status",
              render: (assumption) => formatRaidLabel(assumption.status),
            },
          ]}
          description="Delivery assumptions and their validation state."
          emptyMessage="No assumptions yet."
          items={assumptions}
          title="Assumptions"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (dependency) => dependency.title },
            {
              header: "Type",
              render: (dependency) => formatRaidLabel(dependency.type),
            },
            { header: "Owner", render: formatRaidOwner },
            {
              header: "Status",
              render: (dependency) => formatRaidLabel(dependency.status),
            },
          ]}
          description="Internal and external dependencies for the project."
          emptyMessage="No dependencies yet."
          items={dependencies}
          title="Dependencies"
        />
      </section>
    </div>
  );
}

function ProjectWorkspaceLoadingState() {
  return (
    <div className="space-y-6">
      <section className="h-40 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-32 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="h-72 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
        <div className="h-72 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-72 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </section>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </section>
  );
}
