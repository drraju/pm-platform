import Link from "next/link";
import React from "react";
import { SectionCard } from "@/components/ui/card";
import { ContentGrid } from "@/components/ui/content-grid";
import { SectionHeader } from "@/components/ui/section-header";
import type {
  ApiProjectDetails,
  ApiProjectMember,
  ApiRaidItem,
  ApiTask,
} from "@/features/projects";
import {
  TimelineSnapshot,
  type TimelineSnapshotItem,
} from "./timeline-snapshot";

type ProjectWorkspaceOverviewProps = {
  project: ApiProjectDetails;
};

type ActivityItem = {
  date?: string | null;
  label: string;
  title: string;
};

export function ProjectWorkspaceOverview({
  project,
}: ProjectWorkspaceOverviewProps) {
  const tasks = project.tasks ?? [];
  const milestones = tasks.filter((task) => task.taskKind === "milestone");
  const risks = project.risks ?? [];
  const issues = project.issues ?? [];
  const members = project.members ?? [];
  const basePath = `/projects/${project.id}`;
  const progress = calculateProgress(tasks);
  const activeWork = tasks.filter(
    (task) => task.status !== "done" && task.taskKind !== "summary",
  );
  const assignedActiveWork = activeWork.filter((task) => task.assignee).length;
  const upcomingMilestones = getUpcomingMilestones(milestones);
  const recentActivity = getRecentActivity({
    issues,
    members,
    milestones,
    risks,
    tasks,
  });
  const openRisks = risks.filter((risk) => !isClosedRaidStatus(risk.status));
  const openIssues = issues.filter(
    (issue) => !isClosedRaidStatus(issue.status),
  );
  const openRaidItems = [...openRisks, ...openIssues].sort(
    (left, right) => getRaidTime(right) - getRaidTime(left),
  );
  const timelineItems = buildTimelineItems({
    milestones,
    progress,
    targetEndDate: project.targetEndDate,
  });

  return (
    <div aria-label="Project overview" className="space-y-6">
      <ContentGrid
        aria-label="Project health, timeline and insights"
        columns={2}
      >
        <DashboardPanel
          description="The minimum information needed to understand current Project condition."
          title="Project Health"
        >
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-2 2xl:grid-cols-5">
            <OverviewItem
              label="Overall Health"
              value={formatLabel(project.health?.status ?? project.status)}
            />
            <OverviewItem
              label="Schedule"
              value={formatSchedule(project.targetEndDate)}
            />
            <OverviewItem
              label="Progress"
              value={formatLabel(project.status)}
            />
            <OverviewItem
              label="Project Manager"
              value={formatUser(project.owner)}
            />
            <OverviewItem label="Completion" value={`${progress}%`} />
          </dl>
        </DashboardPanel>

        <DashboardPanel
          description="Recommendations will appear here when explainable Project insights are available."
          title="AI Insights"
        >
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            No recommendations available.
          </p>
        </DashboardPanel>

        <div className="xl:col-span-2">
          <TimelineSnapshot
            items={timelineItems}
            planningHref={`${basePath}/planning`}
          />
        </div>
      </ContentGrid>

      <ContentGrid
        aria-label="Upcoming milestones and recent activity"
        columns={2}
      >
        <DashboardPanel
          action={
            <Link
              className="text-sm font-semibold text-brand hover:text-brand-dark"
              href={`${basePath}/planning`}
            >
              Open Planning
            </Link>
          }
          description="The next five incomplete checkpoints requiring coordination."
          title="Upcoming Milestones"
        >
          {upcomingMilestones.length > 0 ? (
            <ol className="divide-y divide-slate-100">
              {upcomingMilestones.slice(0, 5).map((milestone) => (
                <li
                  className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[minmax(0,1.4fr)_auto] sm:items-start"
                  key={milestone.id}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">
                      {milestone.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatTaskOwner(milestone)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-semibold text-slate-700">
                      {formatTaskDate(milestone)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {getMilestoneStatus(milestone)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-5 text-sm text-slate-500">
              No upcoming milestones.
            </p>
          )}
        </DashboardPanel>

        <DashboardPanel
          action={
            <Link
              className="text-sm font-semibold text-brand hover:text-brand-dark"
              href={`${basePath}/reports`}
            >
              View All Activity
            </Link>
          }
          description="The latest meaningful Project events."
          title="Recent Activity"
        >
          {recentActivity.length > 0 ? (
            <ol className="divide-y divide-slate-100">
              {recentActivity.slice(0, 5).map((activity) => (
                <li
                  className="py-3 first:pt-0"
                  key={`${activity.label}-${activity.title}`}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {activity.label}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {activity.title}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-medium text-slate-500">
                      {formatDate(activity.date)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-5 text-sm text-slate-500">No recent activity.</p>
          )}
        </DashboardPanel>
      </ContentGrid>

      <ContentGrid
        aria-label="Operational attention"
        columns={2}
      >
        <DashboardPanel
          action={
            <Link
              className="text-sm font-semibold text-brand hover:text-brand-dark"
              href={`${basePath}/raid`}
            >
              Open RAID
            </Link>
          }
          description="Open exposure that may require a response or decision."
          title="Open Risks & Issues"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryLink
              href={`${basePath}/raid`}
              label="Open Risks"
              value={openRisks.length}
            />
            <SummaryLink
              href={`${basePath}/raid`}
              label="Open Issues"
              value={openIssues.length}
            />
          </div>

          {openRaidItems.length > 0 ? (
            <ol className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {openRaidItems.slice(0, 3).map((item) => (
                <li className="py-3" key={item.id}>
                  <Link
                    className="flex items-start justify-between gap-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    href={`${basePath}/raid`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-950">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        {formatLabel(item.type)} · {formatLabel(item.status)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-brand">
                      Review
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
              No open risks or issues.
            </p>
          )}
        </DashboardPanel>

        <DashboardPanel
          action={
            <Link
              className="text-sm font-semibold text-brand hover:text-brand-dark"
              href={`${basePath}/team`}
            >
              Open Team
            </Link>
          }
          description="A concise view of the people attached to current Project work."
          title="Resource Summary"
        >
          <dl className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric label="Project Members" value={members.length} />
            <SummaryMetric label="Active Work" value={activeWork.length} />
            <SummaryMetric
              label="Assigned Active Work"
              value={`${assignedActiveWork}/${activeWork.length}`}
            />
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Capacity and availability detail remain in the Resource Workspace
            when authoritative data is available.
          </p>
        </DashboardPanel>
      </ContentGrid>

      <DashboardPanel
        description="Continue in the workspace that owns the next action."
        title="Quick Actions"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction href={`${basePath}/planning`} label="Open Planning" />
          <QuickAction href={`${basePath}/tasks`} label="Open Tasks" />
          <QuickAction href={`${basePath}/raid`} label="Open RAID" />
          <QuickAction href={`${basePath}/reports`} label="Open Reports" />
        </div>
      </DashboardPanel>
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold capitalize text-slate-950">
        {value || "Unassigned"}
      </dd>
    </div>
  );
}

function DashboardPanel({
  action,
  children,
  description,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <SectionCard>
      <SectionHeader
        action={action}
        description={description}
        descriptionSize="xs"
        title={title}
      />
      <div className="mt-4">{children}</div>
    </SectionCard>
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
      aria-label={label}
      className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-3 text-sm transition hover:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/30"
      href={href}
    >
      <span className="font-medium text-slate-600">{label}</span>
      <span className="text-xl font-semibold text-slate-950">{value}</span>
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
    <div className="rounded-md border border-slate-200 px-3 py-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-2 text-xl font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="rounded-md bg-brand px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand/90 focus:outline-none focus:ring-2 focus:ring-brand/30"
      href={href}
    >
      {label}
    </Link>
  );
}

function buildTimelineItems({
  milestones,
  progress,
  targetEndDate,
}: {
  milestones: ApiTask[];
  progress: number;
  targetEndDate?: string | null;
}): TimelineSnapshotItem[] {
  const nextMilestone = getNextMilestone(milestones);
  const upcomingRelease = getMilestoneByCategory(milestones, "release");
  const goLive = getMilestoneByCategory(milestones, "go_live");

  return [
    {
      date: formatDate(new Date().toISOString()),
      isCurrent: true,
      label: "Today",
      status: "Current",
    },
    buildMilestoneCheckpoint("Next Milestone", nextMilestone),
    buildMilestoneCheckpoint("Upcoming Release", upcomingRelease),
    buildMilestoneCheckpoint("Go Live", goLive),
    {
      date: formatDate(targetEndDate),
      label: "Project Finish",
      status: getFinishStatus(targetEndDate, progress),
    },
  ];
}

function buildMilestoneCheckpoint(
  label: string,
  milestone?: ApiTask | null,
): TimelineSnapshotItem {
  return {
    date: milestone ? formatTaskDate(milestone) : "Not scheduled",
    label,
    status: milestone ? getMilestoneStatus(milestone) : undefined,
  };
}

function getMilestoneStatus(milestone: ApiTask) {
  if (milestone.status === "done") {
    return "Completed";
  }

  const date = getTaskDate(milestone);
  if (date && new Date(date).getTime() < startOfToday().getTime()) {
    return "Overdue";
  }

  return formatLabel(milestone.status);
}

function getFinishStatus(
  targetEndDate: string | null | undefined,
  progress: number,
) {
  if (!targetEndDate) {
    return undefined;
  }

  if (progress >= 100) {
    return "Completed";
  }

  return new Date(targetEndDate).getTime() < startOfToday().getTime()
    ? "Overdue"
    : undefined;
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
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

function isClosedRaidStatus(status: string) {
  return ["accepted", "approved", "closed", "done", "resolved"].includes(
    status.toLowerCase(),
  );
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
  return (
    milestones
      .filter((milestone) => milestone.milestoneCategory === category)
      .sort(compareTasksByDate)[0] ?? null
  );
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

function formatSchedule(targetEndDate?: string | null) {
  return targetEndDate
    ? `Finish ${formatDate(targetEndDate)}`
    : "Not scheduled";
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
