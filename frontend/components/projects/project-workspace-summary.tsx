import React from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import type { ApiTask } from "@/features/projects";

type ProjectWorkspaceSummaryProps = {
  onSelectMetric?: (status: "all" | ApiTask["status"]) => void;
  tasks: ApiTask[];
};

export function ProjectWorkspaceSummary({
  onSelectMetric,
  tasks,
}: ProjectWorkspaceSummaryProps) {
  const summary = {
    blocked: tasks.filter((task) => task.status === "blocked").length,
    completed: tasks.filter((task) => task.status === "done").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    total: tasks.length,
  };

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        href={onSelectMetric ? "#plan" : undefined}
        label="Total Tasks"
        onClick={onSelectMetric ? () => onSelectMetric("all") : undefined}
        value={summary.total}
      />
      <SummaryCard
        href={onSelectMetric ? "#plan" : undefined}
        label="Completed"
        onClick={onSelectMetric ? () => onSelectMetric("done") : undefined}
        value={summary.completed}
        tone="success"
      />
      <SummaryCard
        href={onSelectMetric ? "#plan" : undefined}
        label="In Progress"
        onClick={onSelectMetric ? () => onSelectMetric("in_progress") : undefined}
        value={summary.inProgress}
        tone="warning"
      />
      <SummaryCard
        href={onSelectMetric ? "#plan" : undefined}
        label="Blocked"
        onClick={onSelectMetric ? () => onSelectMetric("blocked") : undefined}
        value={summary.blocked}
        tone="danger"
      />
    </section>
  );
}
