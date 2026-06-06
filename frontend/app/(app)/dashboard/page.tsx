"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { PageHeader } from "@/components/layout/page-header";
import {
  getMyDashboard,
  type ApiDashboardIssue,
  type ApiDashboardProject,
  type ApiDashboardRisk,
  type ApiDashboardTask,
  type ApiMeDashboard,
} from "@/features/dashboard";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<ApiMeDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setError(null);
      setIsLoading(true);
      try {
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
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        description="A personal operating view of your assigned projects, task commitments, and owned RAID items."
        eyebrow="User dashboard"
        title="My dashboard"
      />

      {isLoading ? <DashboardLoadingState /> : null}

      {!isLoading && error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {!isLoading && !error && dashboard ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Tasks"
              value={dashboard.taskSummary.total}
            />
            <SummaryCard
              label="In progress"
              tone="warning"
              value={dashboard.taskSummary.inProgress}
            />
            <SummaryCard
              label="Blocked"
              tone="danger"
              value={dashboard.taskSummary.blocked}
            />
            <SummaryCard
              label="Overdue"
              tone="danger"
              value={dashboard.taskSummary.overdue}
            />
          </section>

          <DashboardSection
            emptyMessage="No assigned projects yet."
            items={dashboard.assignedProjects}
            renderItem={(project) => <ProjectItem project={project} />}
            title="Assigned Projects"
          />

          <section className="grid gap-6 xl:grid-cols-3">
            <DashboardSection
              emptyMessage="No upcoming tasks due in the next 7 days."
              items={dashboard.upcomingTasks}
              renderItem={(task) => <TaskItem task={task} />}
              title="Upcoming Tasks"
            />
            <DashboardSection
              emptyMessage="No open risks owned by you."
              items={dashboard.openRisks}
              renderItem={(risk) => <RiskItem risk={risk} />}
              title="Open Risks"
            />
            <DashboardSection
              emptyMessage="No open issues owned by you."
              items={dashboard.openIssues}
              renderItem={(issue) => <IssueItem issue={issue} />}
              title="Open Issues"
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-32 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </section>
      <div className="h-72 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
      <section className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="h-64 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </section>
    </div>
  );
}

function ProjectItem({ project }: { project: ApiDashboardProject }) {
  return (
    <Link className="block text-sm" href={`/projects/${project.id}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{project.name}</h3>
          <p className="mt-1 text-slate-600">
            Role: {formatLabel(project.role)}
          </p>
        </div>
        <span className="shrink-0 capitalize text-slate-500">
          {formatLabel(project.status)}
        </span>
      </div>
    </Link>
  );
}

function TaskItem({ task }: { task: ApiDashboardTask }) {
  return (
    <article className="text-sm">
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
    </article>
  );
}

function RiskItem({ risk }: { risk: ApiDashboardRisk }) {
  return (
    <article className="text-sm">
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
    </article>
  );
}

function IssueItem({ issue }: { issue: ApiDashboardIssue }) {
  return (
    <article className="text-sm">
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
    </article>
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
