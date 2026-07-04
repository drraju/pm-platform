import Link from "next/link";
import React from "react";
import type {
  ApiProjectDetails,
  ApiProjectMember,
  ApiRaidItem,
  ApiTask,
} from "@/features/projects";

type ProjectWorkspaceOverviewProps = {
  project: ApiProjectDetails;
};

type ActivityItem = {
  date?: string | null;
  label: string;
  title: string;
};

type KpiCard = {
  closed?: number;
  href: string;
  label: string;
  open?: number;
  total: number;
};

export function ProjectWorkspaceOverview({
  project,
}: ProjectWorkspaceOverviewProps) {
  const tasks = project.tasks ?? [];
  const milestones = tasks.filter((task) => task.taskKind === "milestone");
  const risks = project.risks ?? [];
  const issues = project.issues ?? [];
  const assumptions = project.assumptions ?? [];
  const dependencies = project.dependencies ?? [];
  const members = project.members ?? [];
  const basePath = `/projects/${project.id}`;
  const progress = calculateProgress(tasks);
  const upcomingMilestones = getUpcomingMilestones(milestones);
  const recentActivity = getRecentActivity({
    issues,
    members,
    milestones,
    risks,
    tasks,
  });
  const recentRaidItems = getRecentRaidItems({
    assumptions,
    dependencies,
    issues,
    risks,
  });
  const kpis: KpiCard[] = [
    {
      closed: countTasksByClosedState(tasks, true),
      href: `${basePath}/tasks`,
      label: "Tasks",
      open: countTasksByClosedState(tasks, false),
      total: tasks.length,
    },
    {
      closed: countTasksByClosedState(milestones, true),
      href: `${basePath}/planning`,
      label: "Milestones",
      open: countTasksByClosedState(milestones, false),
      total: milestones.length,
    },
    {
      closed: countRaidByClosedState(risks, true),
      href: `${basePath}/raid`,
      label: "Risks",
      open: countRaidByClosedState(risks, false),
      total: risks.length,
    },
    {
      closed: countRaidByClosedState(issues, true),
      href: `${basePath}/raid`,
      label: "Issues",
      open: countRaidByClosedState(issues, false),
      total: issues.length,
    },
    {
      closed: countRaidByClosedState(dependencies, true),
      href: `${basePath}/raid`,
      label: "Dependencies",
      open: countRaidByClosedState(dependencies, false),
      total: dependencies.length,
    },
    {
      href: `${basePath}/team`,
      label: "Team Members",
      total: members.length,
    },
  ];
  const timelineItems = [
    { label: "Today", value: formatDate(new Date().toISOString()) },
    {
      label: "Next Milestone",
      value: formatMilestoneSummary(getNextMilestone(milestones)),
    },
    {
      label: "Upcoming Release",
      value: formatMilestoneSummary(getMilestoneByCategory(milestones, "release")),
    },
    {
      label: "Go Live",
      value: formatMilestoneSummary(getMilestoneByCategory(milestones, "go_live")),
    },
    { label: "Project Finish", value: formatDate(project.targetEndDate) },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Executive Overview
            </h2>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {project.name}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2 text-sm">
            <span className="font-medium text-slate-500">Health</span>
            <span className="ml-2 font-semibold text-slate-950">
              {formatLabel(project.health?.status ?? project.status)}
            </span>
          </div>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewItem label="Project Name" value={project.name} />
          <OverviewItem label="Status" value={formatLabel(project.status)} />
          <OverviewItem
            label="Health"
            value={formatLabel(project.health?.status ?? project.status)}
          />
          <OverviewItem label="Progress" value={`${progress}%`} />
          <OverviewItem label="Start Date" value={formatDate(project.startDate)} />
          <OverviewItem
            label="Planned Finish"
            value={formatDate(project.targetEndDate)}
          />
          <OverviewItem
            label="Project Manager"
            value={formatUser(project.owner)}
          />
          <OverviewItem
            label="Business Owner"
            value={formatUser(project.businessOwner)}
          />
        </dl>
      </section>

      <section
        aria-label="Project KPIs"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      >
        {kpis.map((kpi) => (
          <Link
            aria-label={`Open ${kpi.label}`}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-soft transition hover:border-brand/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand/30"
            href={kpi.href}
            key={kpi.label}
          >
            <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {kpi.total}
            </p>
            <div className="mt-3 flex gap-4 text-xs font-semibold text-slate-500">
              {typeof kpi.open === "number" ? (
                <span>Open {kpi.open}</span>
              ) : null}
              {typeof kpi.closed === "number" ? (
                <span>Closed {kpi.closed}</span>
              ) : null}
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <DashboardPanel title="Timeline Snapshot">
          <div className="grid gap-3 sm:grid-cols-5">
            {timelineItems.map((item) => (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
                key={item.label}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <CompactDashboardPanel
          footer={
            <Link
              className="text-sm font-semibold text-brand hover:text-brand-dark"
              href={`${basePath}/reports`}
            >
              View All Activity
            </Link>
          }
          title="Recent Activity"
        >
          {recentActivity.length > 0 ? (
            <ol className="divide-y divide-slate-100">
              {recentActivity.slice(0, 2).map((activity) => (
                <li className="py-3" key={`${activity.label}-${activity.title}`}>
                  <p className="text-sm font-semibold text-slate-950">
                    {activity.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{activity.title}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {formatDate(activity.date)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-5 text-sm text-slate-500">No recent activity.</p>
          )}
        </CompactDashboardPanel>

        <CompactDashboardPanel title="Recent RAID">
          {recentRaidItems.length > 0 ? (
            <ol className="divide-y divide-slate-100">
              {recentRaidItems.slice(0, 3).map((item) => (
                <li className="py-3" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {formatLabel(item.type)} · {formatLabel(item.status)}
                      </p>
                    </div>
                    <Link
                      className="shrink-0 text-xs font-semibold text-brand hover:text-brand-dark"
                      href={`${basePath}/raid`}
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-5 text-sm text-slate-500">No recent RAID items.</p>
          )}
        </CompactDashboardPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <CompactDashboardPanel title="Upcoming Milestones">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Milestone</th>
                  <th className="py-2 pr-4 font-semibold">Date</th>
                  <th className="py-2 pr-4 font-semibold">Owner</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upcomingMilestones.length > 0 ? (
                  upcomingMilestones.slice(0, 5).map((milestone) => (
                    <tr key={milestone.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-950">
                        {milestone.title}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {formatTaskDate(milestone)}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {formatTaskOwner(milestone)}
                      </td>
                      <td className="py-3 text-slate-600">
                        {formatLabel(milestone.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-5 text-sm text-slate-500" colSpan={4}>
                      No upcoming milestones.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CompactDashboardPanel>

        <DashboardPanel title="RAID Summary">
          <div className="grid gap-3">
            <SummaryLink
              href={`${basePath}/raid`}
              label="Open Risks"
              value={countRaidByClosedState(risks, false)}
            />
            <SummaryLink
              href={`${basePath}/raid`}
              label="Open Issues"
              value={countRaidByClosedState(issues, false)}
            />
            <SummaryLink
              href={`${basePath}/raid`}
              label="Assumptions"
              value={assumptions.length}
            />
            <SummaryLink
              href={`${basePath}/raid`}
              label="Decisions"
              value={countDecisions(assumptions)}
            />
          </div>
        </DashboardPanel>

        <DashboardPanel title="Team Summary">
          <div className="grid gap-3">
            <SummaryMetric label="Team Members" value={members.length} />
            <SummaryMetric
              label="Active Tasks"
              value={countTasksByClosedState(tasks, false)}
            />
            <SummaryMetric label="Workload" value="Reserved" />
            <SummaryMetric label="Availability" value="Reserved" />
          </div>
        </DashboardPanel>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-semibold text-slate-950">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <QuickAction href={`${basePath}/planning`} label="Open Planning" />
          <QuickAction href={`${basePath}/tasks`} label="Open Tasks" />
          <QuickAction href={`${basePath}/raid`} label="Open RAID" />
          <QuickAction href={`${basePath}/reports`} label="Open Reports" />
        </div>
      </section>
    </div>
  );
}

function OverviewItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-slate-950">
        {value || "Unassigned"}
      </dd>
    </div>
  );
}

function DashboardPanel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CompactDashboardPanel({
  children,
  footer,
  title,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  title: string;
}) {
  return (
    <section className="flex h-[210px] flex-col rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="shrink-0">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {children}
      </div>
      {footer ? (
        <div className="mt-3 shrink-0 border-t border-slate-100 pt-3">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

function SummaryLink({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm transition hover:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/30"
      href={href}
    >
      <span className="font-medium text-slate-600">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </Link>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
      <span className="font-medium text-slate-600">{label}</span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand/30"
      href={href}
    >
      {label}
    </Link>
  );
}

function calculateProgress(tasks: ApiTask[]) {
  if (tasks.length === 0) {
    return 0;
  }

  const totalProgress = tasks.reduce(
    (sum, task) =>
      sum + (task.percentComplete ?? (task.status === "done" ? 100 : 0)),
    0,
  );

  return Math.round(totalProgress / tasks.length);
}

function countTasksByClosedState(tasks: ApiTask[], closed: boolean) {
  return tasks.filter((task) => (task.status === "done") === closed).length;
}

function countRaidByClosedState(items: ApiRaidItem[], closed: boolean) {
  return items.filter((item) => isClosedRaidStatus(item.status) === closed)
    .length;
}

function isClosedRaidStatus(status: string) {
  return ["accepted", "approved", "closed", "done", "resolved"].includes(
    status.toLowerCase(),
  );
}

function countDecisions(items: ApiRaidItem[]) {
  return items.filter((item) =>
    [item.type, item.validationStatus, item.title]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes("decision")),
  ).length;
}

function getUpcomingMilestones(milestones: ApiTask[]) {
  return milestones
    .filter((milestone) => milestone.status !== "done")
    .sort(compareTasksByDate)
    .slice(0, 5);
}

function getNextMilestone(milestones: ApiTask[]) {
  return getUpcomingMilestones(milestones)[0] ?? null;
}

function getMilestoneByCategory(
  milestones: ApiTask[],
  category: NonNullable<ApiTask["milestoneCategory"]>,
) {
  return milestones
    .filter((milestone) => milestone.milestoneCategory === category)
    .sort(compareTasksByDate)[0] ?? null;
}

function compareTasksByDate(left: ApiTask, right: ApiTask) {
  return (
    getTaskTime(left) - getTaskTime(right) ||
    left.title.localeCompare(right.title)
  );
}

function getTaskTime(task: ApiTask) {
  return new Date(getTaskDate(task) ?? "9999-12-31").getTime();
}

function getTaskDate(task: ApiTask) {
  return task.plannedEndDate ?? task.dueDate ?? task.plannedStartDate ?? null;
}

function formatMilestoneSummary(task?: ApiTask | null) {
  if (!task) {
    return "Not scheduled";
  }

  return `${task.title} - ${formatTaskDate(task)}`;
}

function formatTaskDate(task: ApiTask) {
  return formatDate(getTaskDate(task));
}

function formatTaskOwner(task: ApiTask) {
  return task.assignee
    ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim() ||
        task.assignee.email
    : "Unassigned";
}

function getRecentActivity({
  issues,
  members,
  milestones,
  risks,
  tasks,
}: {
  issues: ApiRaidItem[];
  members: ApiProjectMember[];
  milestones: ApiTask[];
  risks: ApiRaidItem[];
  tasks: ApiTask[];
}) {
  const taskActivity = tasks.flatMap((task) => {
    const auditTask = task as ApiTask & {
      createdAt?: string | null;
      updatedAt?: string | null;
    };
    const items: ActivityItem[] = [];
    if (auditTask.createdAt) {
      items.push({
        date: auditTask.createdAt,
        label: "Task Created",
        title: task.title,
      });
    }
    if (task.status === "done") {
      items.push({
        date: task.actualEndDate ?? auditTask.updatedAt ?? auditTask.createdAt,
        label: "Task Completed",
        title: task.title,
      });
    }
    return items;
  });
  const riskActivity = risks.map((risk) => ({
    date: getRaidAuditDate(risk),
    label: "Risk Added",
    title: risk.title,
  }));
  const issueActivity = issues
    .filter((issue) => isClosedRaidStatus(issue.status))
    .map((issue) => ({
      date: getRaidAuditDate(issue),
      label: "Issue Closed",
      title: issue.title,
    }));
  const milestoneActivity = milestones
    .filter((milestone) => milestone.status === "done")
    .map((milestone) => ({
      date: milestone.actualEndDate ?? getTaskDate(milestone),
      label: "Milestone Reached",
      title: milestone.title,
    }));
  const memberActivity = members
    .filter((member) => member.createdAt)
    .map((member) => ({
      date: member.createdAt,
      label: "Team Member Added",
      title: formatMemberName(member),
    }));

  return [
    ...taskActivity,
    ...riskActivity,
    ...issueActivity,
    ...milestoneActivity,
    ...memberActivity,
  ]
    .sort((left, right) => getActivityTime(right) - getActivityTime(left))
    .slice(0, 10);
}

function getRecentRaidItems({
  assumptions,
  dependencies,
  issues,
  risks,
}: {
  assumptions: ApiRaidItem[];
  dependencies: ApiRaidItem[];
  issues: ApiRaidItem[];
  risks: ApiRaidItem[];
}) {
  return [...risks, ...issues, ...assumptions, ...dependencies]
    .sort((left, right) => getRaidTime(right) - getRaidTime(left));
}

function getRaidAuditDate(item: ApiRaidItem) {
  const auditItem = item as ApiRaidItem & {
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  return auditItem.updatedAt ?? auditItem.createdAt ?? item.dueDate;
}

function getActivityTime(activity: ActivityItem) {
  return new Date(activity.date ?? "1900-01-01").getTime();
}

function getRaidTime(item: ApiRaidItem) {
  return new Date(getRaidAuditDate(item) ?? "1900-01-01").getTime();
}

function formatMemberName(member: ApiProjectMember) {
  if (member.user) {
    return (
      member.user.displayName ||
      `${member.user.firstName} ${member.user.lastName}`.trim() ||
      member.user.email
    );
  }

  return member.userId;
}

function formatUser(
  user?: {
    email?: string;
    firstName: string;
    lastName: string;
  } | null,
) {
  return user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email || null
    : null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "Unknown";
}
