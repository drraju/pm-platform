import React from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import type { ApiTask, ApiTaskCounts } from "@/features/projects";
import { countPlanningItems } from "@/features/projects/planning";

type ProjectWorkspaceSummaryProps = {
  onSelectMetric?: (status: "all" | ApiTask["status"]) => void;
  taskCounts?: ApiTaskCounts;
  tasks: ApiTask[];
};

export function ProjectWorkspaceSummary({
  onSelectMetric,
  tasks,
}: ProjectWorkspaceSummaryProps) {
  const planningCounts = countPlanningItems(tasks);
  const summary = {
    milestones: planningCounts.milestones,
    phases: planningCounts.phases,
    tasks: planningCounts.tasks,
  };

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        href={onSelectMetric ? "#plan" : undefined}
        label="Phases"
        onClick={onSelectMetric ? () => onSelectMetric("all") : undefined}
        value={summary.phases}
      />
      <SummaryCard
        href={onSelectMetric ? "#plan" : undefined}
        label="Tasks"
        onClick={onSelectMetric ? () => onSelectMetric("all") : undefined}
        value={summary.tasks}
        tone="success"
      />
      <SummaryCard
        href={onSelectMetric ? "#plan" : undefined}
        label="Milestones"
        onClick={onSelectMetric ? () => onSelectMetric("all") : undefined}
        value={summary.milestones}
        tone="warning"
      />
      <SummaryCard
        href={onSelectMetric ? "#plan" : undefined}
        label="Plan Items"
        onClick={onSelectMetric ? () => onSelectMetric("all") : undefined}
        value={summary.phases + summary.tasks + summary.milestones}
        tone="danger"
      />
    </section>
  );
}
