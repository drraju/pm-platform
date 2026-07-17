"use client";

import Link from "next/link";
import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { PageHeader } from "@/components/layout/page-header";
import { ContentGrid } from "@/components/ui/content-grid";
import { ErrorState, LoadingSkeleton } from "@/components/ui/states";
import {
  ProjectHealthBadge,
  ProjectHealthReasons,
} from "@/components/projects/project-health-badge";
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
    <div className="space-y-5">
      <PageHeader
        description="Your assigned projects, delivery commitments, and items that need attention."
        eyebrow="Home workspace"
        title="Your work"
      />

      {isLoading ? <DashboardLoadingState /> : null}

      {!isLoading && error ? (
        <ErrorState variant="page">{error}</ErrorState>
      ) : null}

      {!isLoading && !error && dashboard ? (
        <>
          <section
            aria-label="Work summary"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          >
            <SummaryCard
              href="/tasks"
              label="Assigned"
              value={dashboard.taskSummary.total}
            />
            <SummaryCard
              href="/tasks?status=in_progress"
              label="In progress"
              tone="warning"
              value={dashboard.taskSummary.inProgress}
            />
            <SummaryCard
              href="/tasks?status=blocked"
              label="Blocked"
              tone="danger"
              value={dashboard.taskSummary.blocked}
            />
            <SummaryCard
              href="/tasks?timing=overdue"
              label="Overdue"
              tone="danger"
              value={dashboard.taskSummary.overdue}
            />
            <section className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-600">
                Overall health
              </p>
              <div className="mt-2.5">
                <ProjectHealthBadge
                  reasons={dashboard.health.reasons}
                  status={dashboard.health.status}
                />
                <ProjectHealthReasons reasons={dashboard.health.reasons} />
              </div>
            </section>
          </section>

          <DashboardSection
            emptyMessage="No projects are assigned to you yet. New assignments will appear here."
            items={dashboard.assignedProjects}
            renderItem={(project) => <ProjectItem project={project} />}
            title="Assigned projects"
          />

          <ContentGrid columns={3} gap={4}>
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
          </ContentGrid>
        </>
      ) : null}
    </div>
  );
}

function PageLoading() {
  return <DashboardLoadingState />;
}

function DashboardLoadingState() {
  return (
    <div aria-label="Loading Home workspace" className="space-y-5" role="status">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <LoadingSkeleton
            className="h-28 rounded-lg bg-slate-200/70"
            key={index}
          />
        ))}
      </section>
      <LoadingSkeleton className="h-64 rounded-lg bg-slate-200/70" />
      <ContentGrid columns={3} gap={4}>
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingSkeleton
            className="h-56 rounded-lg bg-slate-200/70"
            key={index}
          />
        ))}
      </ContentGrid>
    </div>
  );
}

function ProjectItem({ project }: { project: ApiDashboardProject }) {
  const healthStatus = project.health?.status ?? "GREEN";

  return (
    <article className="grid gap-3 text-sm md:grid-cols-[minmax(0,1.1fr)_minmax(7.5rem,0.55fr)_auto_minmax(0,1fr)_auto] md:items-center md:gap-4">
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-slate-950">
          {project.name}
        </h3>
        <p className="mt-0.5 text-slate-500 md:hidden">
          {formatLabel(project.role)}
        </p>
      </div>
      <p className="hidden capitalize text-slate-600 md:block">
        {formatLabel(project.role)}
      </p>
      <ProjectHealthBadge
        reasons={project.health?.reasons}
        status={healthStatus}
      />
      <p className="min-w-0 leading-5 text-slate-600">
        {getProjectInsight(project)}
      </p>
      <Link
        aria-label={`Open project ${project.name}`}
        className="inline-flex min-h-9 w-fit items-center rounded-md px-2.5 py-1.5 font-semibold text-brand transition hover:bg-brand/10"
        href={`/projects/${project.id}`}
      >
        Open project
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{task.title}</h3>
          <p className="mt-1 text-slate-600">
            {task.projectName || "No project"}
          </p>
        </div>
        <span className="shrink-0 capitalize text-slate-500">
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{risk.title}</h3>
          <p className="mt-1 text-slate-600">
            {risk.projectName || "No project"}
          </p>
        </div>
        <span className="shrink-0 capitalize text-slate-500">
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{issue.title}</h3>
          <p className="mt-1 text-slate-600">
            {issue.projectName || "No project"}
          </p>
        </div>
        <span className="shrink-0 capitalize text-slate-500">
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

function getProjectInsight(project: ApiDashboardProject) {
  const primaryReason = project.health?.reasons?.find((reason) =>
    Boolean(reason.trim()),
  );

  if (primaryReason) {
    return primaryReason;
  }

  return (project.health?.status ?? "GREEN") === "GREEN"
    ? "No immediate delivery concerns."
    : "Review the latest project health update.";
}
