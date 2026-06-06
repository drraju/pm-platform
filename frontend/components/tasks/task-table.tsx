import React from "react";
import type { ApiTask } from "@/features/tasks";

type TaskTableProps = {
  emptyMessage: string;
  isLoading: boolean;
  tasks: ApiTask[];
};

export function TaskTable({ emptyMessage, isLoading, tasks }: TaskTableProps) {
  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
      <div className="hidden grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.9fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
        <span>Task</span>
        <span>Project</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Due Date</span>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <p className="px-4 py-6 text-sm text-slate-500">Loading tasks...</p>
        ) : null}

        {!isLoading && tasks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">{emptyMessage}</p>
        ) : null}

        {tasks.map((task) => {
          const dueState = getDueState(task);

          return (
            <article
              className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_0.9fr] md:items-center"
              key={task.id}
            >
              <div>
                <h2 className="font-semibold text-slate-950">{task.title}</h2>
                <p className="mt-1 text-xs text-slate-500 md:hidden">
                  {task.project?.name ?? "No project"}
                </p>
              </div>
              <span className="hidden text-slate-600 md:block">
                {task.project?.name ?? "No project"}
              </span>
              <span className="capitalize text-slate-700">
                <span className="font-medium text-slate-500 md:hidden">
                  Status:{" "}
                </span>
                {formatLabel(task.status)}
              </span>
              <span className="capitalize text-slate-600">
                <span className="font-medium text-slate-500 md:hidden">
                  Priority:{" "}
                </span>
                {formatLabel(task.priority)}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-slate-600">
                <span className="font-medium text-slate-500 md:hidden">
                  Due:{" "}
                </span>
                {formatDate(task.dueDate)}
                {dueState ? (
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${dueState.className}`}
                  >
                    {dueState.label}
                  </span>
                ) : null}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getDueState(task: ApiTask) {
  if (!task.dueDate || task.status === "done") {
    return null;
  }

  const today = toDateOnly(new Date());
  const dueDate = toDateOnly(new Date(task.dueDate));
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  if (dueDate < today) {
    return {
      className: "bg-red-50 text-red-700",
      label: "Overdue",
    };
  }

  if (dueDate <= nextWeek) {
    return {
      className: "bg-amber-50 text-amber-700",
      label: "Due this week",
    };
  }

  return null;
}

function toDateOnly(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(value?: string | null) {
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
  return value.replaceAll("_", " ");
}
