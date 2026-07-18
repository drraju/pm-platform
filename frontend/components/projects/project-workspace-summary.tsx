import React from "react";
import {
  KPIGrid,
  SummaryMetricCard,
  type SummaryMetricCardVariant,
} from "@/components/foundation";
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
    <KPIGrid aria-label="Project planning summary">
      <PlanningSummaryMetric
        onSelect={onSelectMetric ? () => onSelectMetric("all") : undefined}
        title="Summaries"
        value={summary.phases}
      />
      <PlanningSummaryMetric
        onSelect={onSelectMetric ? () => onSelectMetric("all") : undefined}
        title="Tasks"
        value={summary.tasks}
        variant="success"
      />
      <PlanningSummaryMetric
        onSelect={onSelectMetric ? () => onSelectMetric("all") : undefined}
        title="Milestones"
        value={summary.milestones}
        variant="warning"
      />
      <PlanningSummaryMetric
        onSelect={onSelectMetric ? () => onSelectMetric("all") : undefined}
        title="Planning Items"
        value={summary.phases + summary.tasks + summary.milestones}
        variant="critical"
      />
    </KPIGrid>
  );
}

function PlanningSummaryMetric({
  onSelect,
  title,
  value,
  variant,
}: {
  onSelect?: () => void;
  title: string;
  value: number;
  variant?: SummaryMetricCardVariant;
}) {
  if (!onSelect) {
    return (
      <SummaryMetricCard title={title} value={value} variant={variant} />
    );
  }

  return (
    <div onClick={onSelect}>
      <SummaryMetricCard
        ariaLabel={`${title}: ${value}. Open project plan`}
        href="#plan"
        title={title}
        value={value}
        variant={variant}
      />
    </div>
  );
}
