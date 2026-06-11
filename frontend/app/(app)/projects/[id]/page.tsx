"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectHealthCard } from "@/components/projects/project-health-card";
import { ProjectWorkspaceOverview } from "@/components/projects/project-workspace-overview";
import {
  formatRaidDate,
  formatRaidLabel,
  formatRaidOwner,
  ProjectWorkspaceRegisterSection,
} from "@/components/projects/project-workspace-register-section";
import { ProjectWorkspaceSummary } from "@/components/projects/project-workspace-summary";
import { ProjectWorkspaceTeam } from "@/components/projects/project-workspace-team";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import {
  addProjectMember,
  getProject,
  getUsers,
  removeProjectMember,
  updateProjectMember,
  type ApiProjectDetails,
  type ApiProjectMember,
} from "@/features/projects";
import type { ApiUser } from "@/lib/api/client";

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  useEffect(() => {
    async function loadProject() {
      setError(null);
      setIsLoading(true);
      try {
        const [projectDetails, userData] = await Promise.all([
          getProject(projectId),
          getUsers(),
        ]);
        setProject(projectDetails);
        setUsers(userData);
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

  async function handleAddMember(input: { role: string; userId: string }) {
    setError(null);
    setIsSavingTeam(true);
    try {
      const member = await addProjectMember(projectId, input);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              members: [...(currentProject.members ?? []), member],
            }
          : currentProject,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add member",
      );
    } finally {
      setIsSavingTeam(false);
    }
  }

  async function handleUpdateMember(
    memberId: string,
    input: { role: string },
  ) {
    setError(null);
    setIsSavingTeam(true);
    try {
      const updatedMember = await updateProjectMember(projectId, memberId, input);
      setProject((currentProject) =>
        replaceMember(currentProject, updatedMember),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update member",
      );
    } finally {
      setIsSavingTeam(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    setError(null);
    setIsSavingTeam(true);
    try {
      await removeProjectMember(projectId, memberId);
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              members: (currentProject.members ?? []).filter(
                (member) => member.id !== memberId,
              ),
            }
          : currentProject,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to remove member",
      );
    } finally {
      setIsSavingTeam(false);
    }
  }

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
    reasons: ['No critical issues, high risks, or overdue task threshold breaches'],
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

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <ProjectWorkspaceOverview project={project} />
        <ProjectHealthCard health={health} />
      </section>

      <ProjectWorkspaceSummary tasks={tasks} />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ProjectWorkspaceTeam
          availableUsers={users}
          isSaving={isSavingTeam}
          members={members}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onUpdateMember={handleUpdateMember}
        />
        <ProjectWorkspaceTasks tasks={tasks} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (risk) => risk.title },
            { header: "Status", render: (risk) => formatRaidLabel(risk.status) },
            {
              header: "Probability",
              render: (risk) => formatRaidLabel(risk.probability),
            },
            { header: "Impact", render: (risk) => formatRaidLabel(risk.impact) },
            { header: "Owner", render: formatRaidOwner },
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
              header: "Status",
              render: (issue) => formatRaidLabel(issue.status),
            },
            {
              header: "Severity",
              render: (issue) => formatRaidLabel(issue.severity),
            },
            { header: "Owner", render: formatRaidOwner },
          ]}
          description="Open and tracked issues affecting delivery."
          emptyMessage="No issues yet."
          items={issues}
          title="Issues"
        />
        <ProjectWorkspaceRegisterSection
          columns={[
            { header: "Title", render: (assumption) => assumption.title },
            {
              header: "Status",
              render: (assumption) => formatRaidLabel(assumption.status),
            },
            {
              header: "Validation Status",
              render: (assumption) => formatRaidLabel(assumption.validationStatus),
            },
            { header: "Owner", render: formatRaidOwner },
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
              header: "Status",
              render: (dependency) => formatRaidLabel(dependency.status),
            },
            {
              header: "Depends On",
              render: (dependency) => dependency.dependsOn ?? "Not set",
            },
            {
              header: "Due Date",
              render: (dependency) => formatRaidDate(dependency.dueDate),
            },
            { header: "Owner", render: formatRaidOwner },
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

function replaceMember(
  project: ApiProjectDetails | null,
  updatedMember: ApiProjectMember,
) {
  if (!project) {
    return project;
  }

  return {
    ...project,
    members: (project.members ?? []).map((member) =>
      member.id === updatedMember.id ? updatedMember : member,
    ),
  };
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
