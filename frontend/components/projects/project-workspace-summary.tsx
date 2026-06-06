import React from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import type { ApiTask } from "@/features/projects";

type ProjectWorkspaceSummaryProps = {
  tasks: ApiTask[];
};

export function ProjectWorkspaceSummary({ tasks }: ProjectWorkspaceSummaryProps) {
  const summary = {
    blocked: tasks.filter((task) => task.status === "blocked").length,
    completed: tasks.filter((task) => task.status === "done").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    total: tasks.length,
  };

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="Total Tasks" value={summary.total} />
      <SummaryCard label="Completed" value={summary.completed} tone="success" />
      <SummaryCard
        label="In Progress"
        value={summary.inProgress}
        tone="warning"
      />
      <SummaryCard label="Blocked" value={summary.blocked} tone="danger" />
    </section>
  );
}
