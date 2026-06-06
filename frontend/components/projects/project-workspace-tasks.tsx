import React from "react";
import type { ApiTask } from "@/features/projects";

type ProjectWorkspaceTasksProps = {
  tasks: ApiTask[];
};

export function ProjectWorkspaceTasks({ tasks }: ProjectWorkspaceTasksProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Tasks</h2>
          <p className="mt-1 text-sm text-slate-500">
            Project tasks, assignments, status, and due dates.
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {tasks.length}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Task</th>
              <th className="px-3 py-3">Assignee</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-slate-500" colSpan={4}>
                  No tasks yet.
                </td>
              </tr>
            ) : null}
            {tasks.map((task) => (
              <tr key={task.id}>
                <td className="px-3 py-3 font-semibold text-slate-950">
                  {task.title}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {task.assignee
                    ? `${task.assignee.firstName} ${task.assignee.lastName}`
                    : "Unassigned"}
                </td>
                <td className="px-3 py-3 capitalize text-slate-600">
                  {formatLabel(task.status)}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {formatDate(task.dueDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
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
