import Link from "next/link";
import React from "react";
import {
  KPIGrid,
  SummaryCard,
  SummaryMetricCard,
  WorkspaceContent,
  WorkspaceSection,
} from "@/components/foundation";
import { getDeliveryAttentionSummary } from "@/components/delivery/delivery-filters";
import { getDeliveryHref } from "@/components/delivery/delivery-views";
import type {
  ApiProjectDetails,
  ApiTask,
} from "@/features/projects";
import {
  TimelineSnapshot,
  type TimelineSnapshotItem,
} from "./timeline-snapshot";

type ProjectWorkspaceOverviewProps = {
  project: ApiProjectDetails;
};

export function ProjectWorkspaceOverview({
  project,
}: ProjectWorkspaceOverviewProps) {
  const tasks = project.tasks ?? [];
  const milestones = tasks.filter((task) => task.taskKind === "milestone");
  const deliveryTasks = tasks.filter((task) => task.taskKind !== "summary");
  const risks = project.risks ?? [];
  const issues = project.issues ?? [];
  const basePath = `/projects/${project.id}`;
  const progress = calculateProgress(tasks);
  const attentionSummary = getDeliveryAttentionSummary(deliveryTasks, null);
  const activeDeliveryTasks = deliveryTasks.filter(
    (task) => task.status !== "done",
  );
  const inProgressDeliveryTasks = deliveryTasks.filter(
    (task) => task.status === "in_progress",
  );
  const completedDeliveryTasks = deliveryTasks.filter(
    (task) => task.status === "done",
  );
  const assignedActiveWork = activeDeliveryTasks.filter((task) => task.assignee)
    .length;
  const openRisks = risks.filter((risk) => !isClosedRaidStatus(risk.status));
  const openIssues = issues.filter(
    (issue) => !isClosedRaidStatus(issue.status),
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
        aria-label="Operational attention and delivery summary"
        className="grid gap-4 xl:grid-cols-2"
        padding="none"
      >
        <SummaryCard
          density="compact"
          action={
            <Link
              className="rounded-sm text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
              href={`${basePath}/govern`}
            >
              Open RAID
            </Link>
          }
          description="Open risks, issues, and delivery pressure that need action."
          title="Attention"
        >
          <KPIGrid as="div" columns={4} gap="compact">
            <SummaryMetricCard
              ariaLabel={`Open Risks: ${openRisks.length}`}
              density="compact"
              href={`${basePath}/govern`}
              title="Open Risks"
              value={openRisks.length}
              variant="critical"
            />
            <SummaryMetricCard
              ariaLabel={`Open Issues: ${openIssues.length}`}
              density="compact"
              href={`${basePath}/govern`}
              title="Open Issues"
              value={openIssues.length}
              variant="warning"
            />
            <SummaryMetricCard
              ariaLabel={`Blocked: ${attentionSummary.blocked}`}
              density="compact"
              href={`${basePath}/delivery`}
              title="Blocked"
              value={attentionSummary.blocked}
              variant="critical"
            />
            <SummaryMetricCard
              ariaLabel={`Overdue: ${attentionSummary.overdue}`}
              density="compact"
              href={`${basePath}/delivery`}
              title="Overdue"
              value={attentionSummary.overdue}
              variant="warning"
            />
          </KPIGrid>
        </SummaryCard>

        <SummaryCard
          density="compact"
          action={
            <Link
              className="rounded-sm text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
              href={getDeliveryHref(project.id)}
            >
              Open Delivery
            </Link>
          }
          description="Execution activity across the delivery queue."
          title="Delivery Summary"
        >
          <KPIGrid as="div" columns={4} gap="compact">
            <SummaryMetricCard
              ariaLabel={`Work items: ${attentionSummary.total}`}
              density="compact"
              title="Work items"
              value={attentionSummary.total}
              variant="neutral"
            />
            <SummaryMetricCard
              ariaLabel={`Active: ${attentionSummary.active}`}
              density="compact"
              title="Active"
              value={attentionSummary.active}
              variant="primary"
            />
            <SummaryMetricCard
              ariaLabel={`In progress: ${inProgressDeliveryTasks.length}`}
              density="compact"
              title="In progress"
              value={inProgressDeliveryTasks.length}
              variant="warning"
            />
            <SummaryMetricCard
              ariaLabel={`Completed: ${completedDeliveryTasks.length}`}
              density="compact"
              title="Completed"
              value={completedDeliveryTasks.length}
              variant="success"
            />
          </KPIGrid>
          <p className="mt-3 text-xs font-medium text-slate-500">
            Assigned {assignedActiveWork} of {activeDeliveryTasks.length} active
            items.
          </p>
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
  const releaseMilestone = getMilestoneByCategory(milestones, "release");
  const goLive = getMilestoneByCategory(milestones, "go_live");

  return [
    {
      date: formatDate(new Date().toISOString()),
      isCurrent: true,
      label: "Today",
      status: "Current",
    },
    buildMilestoneCheckpoint("Next Milestone", nextMilestone),
    buildMilestoneCheckpoint("Release", releaseMilestone),
    buildMilestoneCheckpoint("Go Live", goLive),
    {
      date: formatDate(targetEndDate),
      label: "Finish",
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

function getNextMilestone(milestones: ApiTask[]) {
  return (
    milestones
      .filter((milestone) => milestone.status !== "done")
      .sort(compareTasksByDate)[0] ?? null
  );
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
