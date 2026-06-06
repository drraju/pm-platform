"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { PageHeader } from "@/components/layout/page-header";
import {
  getMyDashboard,
  type ApiMeDashboard,
} from "@/features/dashboard";
import type { ApiProject, ApiRaidItem, ApiTask } from "@/lib/api/client";

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
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Total" value={dashboard.taskSummary.total} />
            <SummaryCard label="Todo" value={dashboard.taskSummary.todo} />
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
              label="Completed"
              tone="success"
              value={dashboard.taskSummary.completed}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <DashboardSection
              emptyMessage="No assigned projects yet."
              items={dashboard.assignedProjects}
              renderItem={(project) => <ProjectItem project={project} />}
              title="Assigned Projects"
            />
            <DashboardSection
              emptyMessage="No upcoming tasks due in the next 7 days."
              items={dashboard.upcomingTasks}
              renderItem={(task) => <TaskItem task={task} />}
              title="Upcoming Tasks"
            />
            <DashboardSection
              emptyMessage="No overdue tasks."
              items={dashboard.overdueTasks}
              renderItem={(task) => <TaskItem task={task} />}
              title="Overdue Tasks"
            />
            <DashboardSection
              emptyMessage="No open risks owned by you."
              items={dashboard.openRisks}
              renderItem={(risk) => <RaidItem item={risk} />}
              title="Open Risks"
            />
            <DashboardSection
              emptyMessage="No open issues owned by you."
              items={dashboard.openIssues}
              renderItem={(issue) => <RaidItem item={issue} />}
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
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            className="h-32 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-64 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </section>
    </div>
  );
}

function ProjectItem({ project }: { project: ApiProject }) {
  return (
    <Link className="block text-sm" href={`/projects/${project.id}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{project.name}</h3>
          <p className="mt-1 text-slate-600">
            {project.description || "No description"}
          </p>
        </div>
        <span className="shrink-0 capitalize text-slate-500">
          {project.status.replaceAll("_", " ")}
        </span>
      </div>
    </Link>
  );
}

function TaskItem({ task }: { task: ApiTask }) {
  return (
    <article className="text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{task.title}</h3>
          <p className="mt-1 text-slate-600">
            {task.project?.name ?? "No project"}
          </p>
        </div>
        <span className="shrink-0 capitalize text-slate-500">
          {task.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Due {task.dueDate ?? "not set"} · Priority {task.priority}
      </p>
    </article>
  );
}

function RaidItem({ item }: { item: ApiRaidItem }) {
  return (
    <article className="text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{item.title}</h3>
          <p className="mt-1 text-slate-600">
            {item.project?.name ?? "No project"}
          </p>
        </div>
        <span className="shrink-0 capitalize text-slate-500">
          {item.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Owner {item.owner ? `${item.owner.firstName} ${item.owner.lastName}` : "Unassigned"}
      </p>
    </article>
  );
}
