import Link from "next/link";
import React from "react";
import {
  EmptyState,
  KPIGrid,
  SummaryCard,
  SummaryMetricCard,
  WorkspaceContent,
  WorkspaceSection,
} from "@/components/foundation";
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
    <WorkspaceContent aria-label="Project overview" spacing="compact">
      <WorkspaceSection
        aria-label="Project timeline"
        className="grid gap-4"
        padding="none"
      >
        <TimelineSnapshot
          items={timelineItems}
          planningHref={`${basePath}/planning`}
        />
      </WorkspaceSection>

      <WorkspaceSection
        aria-label="Operational attention"
        className="grid gap-4 xl:grid-cols-2"
        padding="none"
      >
        <SummaryCard
          action={
            <Link
              className="rounded-sm text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
              href={`${basePath}/govern`}
            >
              Open RAID
            </Link>
          }
          description="Open exposure that may require a response or decision."
          title="Open Risks & Issues"
        >
          <KPIGrid as="div" columns={2} gap="compact">
            <SummaryMetricCard
              ariaLabel={`Open Risks: ${openRisks.length}`}
              href={`${basePath}/govern`}
              title="Open Risks"
              value={openRisks.length}
              variant="critical"
            />
            <SummaryMetricCard
              ariaLabel={`Open Issues: ${openIssues.length}`}
              href={`${basePath}/govern`}
              title="Open Issues"
              value={openIssues.length}
              variant="warning"
            />
          </KPIGrid>

          {openRaidItems.length > 0 ? (
            <ol className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {openRaidItems.slice(0, 3).map((item) => (
                <li className="py-3" key={item.id}>
                  <Link
                    className="flex items-start justify-between gap-3 rounded-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    href={`${basePath}/govern`}
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
            <EmptyState
              className="mt-4"
              compact
              description="No open risks or issues."
              title="No operational attention needed"
            />
          )}
        </SummaryCard>

        <SummaryCard
          action={
            <Link
              className="rounded-sm text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
              href={`${basePath}/team`}
            >
              Open Team
            </Link>
          }
          description="People attached to current work."
          title="Resource Summary"
        >
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Members</dt>
              <dd className="mt-0.5 font-semibold text-slate-950">
                {members.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Active work</dt>
              <dd className="mt-0.5 font-semibold text-slate-950">
                {activeWork.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Assigned</dt>
              <dd className="mt-0.5 font-semibold text-slate-950">
                {assignedActiveWork}/{activeWork.length}
              </dd>
            </div>
          </dl>
        </SummaryCard>
      </WorkspaceSection>

      <WorkspaceSection
        aria-label="Upcoming milestones and recent activity"
        className="grid gap-4 xl:grid-cols-2"
        padding="none"
      >
        <SummaryCard
          action={
            <Link
              className="rounded-sm text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
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
            <EmptyState
              compact
              description="No upcoming milestones."
              title="No milestones scheduled"
            />
          )}
        </SummaryCard>

        <SummaryCard
          action={
            <Link
              className="rounded-sm text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
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
            <EmptyState
              compact
              description="No recent activity."
              title="No activity recorded"
            />
          )}
        </SummaryCard>
      </WorkspaceSection>

    </WorkspaceContent>
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
