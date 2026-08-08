"use client";

import Link from "next/link";
import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { HomeWorkSummary } from "@/components/dashboard/home-work-summary";
import {
  ErrorState,
  LoadingState,
  StatusBadge,
  WorkspaceContent,
  WorkspaceLayout,
  WorkspaceSection,
} from "@/components/foundation";
import { ProjectHealthBadge } from "@/components/projects/project-health-badge";
import {
  getAuthMe,
  getDefaultDashboardPath,
  storeAuthMe,
} from "@/features/auth";
import {
  getMyDashboard,
  type ApiDashboardIssue,
  type ApiDashboardProject,
  type ApiDashboardRisk,
  type ApiDashboardTask,
  type ApiMeDashboard,
} from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<ApiMeDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setError(null);
      setIsLoading(true);
      try {
        const authMe = await getAuthMe();
        storeAuthMe(authMe);

        const defaultDashboardPath = getDefaultDashboardPath(authMe);
        if (defaultDashboardPath !== "/dashboard") {
          router.replace(defaultDashboardPath);
          return;
        }

        setDashboard(await getMyDashboard());
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load dashboard",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  return (
    <WorkspaceLayout spacing="compact">
      <h1 className="text-xl font-semibold tracking-tight text-slate-950">
        Home
      </h1>

      <WorkspaceContent className="space-y-2" spacing="none">
        {isLoading ? <DashboardLoadingState /> : null}

        {!isLoading && error ? (
          <ErrorState message={error} title="Unable to load dashboard" />
        ) : null}

        {!isLoading && !error && dashboard ? (
          <>
            <HomeWorkSummary
              metrics={[
                {
                  href: "/tasks",
                  id: "assigned",
                  label: "Assigned",
                  value: dashboard.taskSummary.total,
                },
                {
                  href: "/tasks?status=in_progress",
                  id: "in-progress",
                  label: "In Progress",
                  value: dashboard.taskSummary.inProgress,
                  variant: "warning",
                },
                {
                  href: "/tasks?status=blocked",
                  id: "blocked",
                  label: "Blocked",
                  value: dashboard.taskSummary.blocked,
                  variant: "critical",
                },
                {
                  href: "/tasks?timing=overdue",
                  id: "overdue",
                  label: "Overdue",
                  value: dashboard.taskSummary.overdue,
                  variant: "critical",
                },
              ]}
            />

            <AssignedProjectsTable projects={dashboard.assignedProjects} />

            <WorkspaceSection
              aria-label="Items needing attention"
              className="grid gap-3 xl:grid-cols-3"
              padding="none"
            >
              <DashboardSection
                emptyMessage="You're clear for the next 7 days."
                items={dashboard.upcomingTasks}
                renderItem={(task) => <TaskItem task={task} />}
                title="Upcoming tasks"
              />
              <DashboardSection
                emptyMessage="You have no open risks to review."
                items={dashboard.openRisks}
                renderItem={(risk) => <RiskItem risk={risk} />}
                title="Open risks"
              />
              <DashboardSection
                emptyMessage="You have no open issues to resolve."
                items={dashboard.openIssues}
                renderItem={(issue) => <IssueItem issue={issue} />}
                title="Open issues"
              />
            </WorkspaceSection>
          </>
        ) : null}
      </WorkspaceContent>
    </WorkspaceLayout>
  );
}

function AssignedProjectsTable({
  projects,
}: {
  projects: ApiDashboardProject[];
}) {
  return (
    <section
      aria-label="Assigned projects"
      className="overflow-hidden rounded-md border border-slate-200 bg-white"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-950">
          Assigned Projects
        </h2>
        <StatusBadge
          aria-label={`${projects.length} assigned projects`}
          size="sm"
        >
          {projects.length}
        </StatusBadge>
      </div>
      <div className="hidden grid-cols-[minmax(0,1fr)_7rem_5.5rem] border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
        <span>Project</span>
        <span>Health</span>
        <span>Action</span>
      </div>
      {projects.length === 0 ? (
        <p className="px-3 py-4 text-sm text-slate-500">
          No projects are assigned to you yet. New assignments will appear here.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {projects.map((project) => (
            <ProjectItem key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}

function PageLoading() {
  return <DashboardLoadingState />;
}

function DashboardLoadingState() {
  return (
    <LoadingState
      className="rounded-ui border border-ui-border bg-ui-surface p-4 shadow-ui-subtle"
      label="Loading Home"
      rows={4}
    />
  );
}

function ProjectItem({ project }: { project: ApiDashboardProject }) {
  const healthStatus = project.health?.status ?? "GREEN";

  return (
    <article className="grid grid-cols-1 items-center gap-2 px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_7rem_5.5rem]">
      <h3 className="min-w-0 truncate font-semibold text-slate-950">
        {project.name}
      </h3>
      <ProjectHealthBadge
        reasons={project.health?.reasons}
        status={healthStatus}
      />
      <Link
        aria-label={`Open project ${project.name}`}
        className="inline-flex w-fit items-center rounded border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        href={`/projects/${project.id}`}
      >
        Open
      </Link>
    </article>
  );
}

function TaskItem({ task }: { task: ApiDashboardTask }) {
  return (
    <Link
      className="block rounded-md text-sm transition hover:bg-slate-50"
      href="/tasks?timing=upcoming"
    >
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-950">{task.title}</h3>
          <p className="text-xs text-slate-600">
            {task.projectName || "No project"}
          </p>
        </div>
        <span className="shrink-0 text-xs capitalize text-slate-500">
          {formatDate(task.dueDate)}
        </span>
      </div>
    </Link>
  );
}

function RiskItem({ risk }: { risk: ApiDashboardRisk }) {
  return (
    <Link
      className="block rounded-md text-sm transition hover:bg-slate-50"
      href={`/risks?severity=${risk.severity}`}
    >
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-950">{risk.title}</h3>
          <p className="text-xs text-slate-600">
            {risk.projectName || "No project"}
          </p>
        </div>
        <span className="shrink-0 text-xs capitalize text-slate-500">
          {formatLabel(risk.severity)}
        </span>
      </div>
    </Link>
  );
}

function IssueItem({ issue }: { issue: ApiDashboardIssue }) {
  return (
    <Link
      className="block rounded-md text-sm transition hover:bg-slate-50"
      href={`/issues?priority=${issue.priority}`}
    >
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-950">{issue.title}</h3>
          <p className="text-xs text-slate-600">
            {issue.projectName || "No project"}
          </p>
        </div>
        <span className="shrink-0 text-xs capitalize text-slate-500">
          {formatLabel(issue.priority)}
        </span>
      </div>
    </Link>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}
