import React from "react";
import type { ApiProjectDetails, ApiTask } from "@/features/projects";

type ProjectWorkspaceOverviewProps = {
  project: ApiProjectDetails;
};

export function ProjectWorkspaceOverview({
  project,
}: ProjectWorkspaceOverviewProps) {
  const overviewRows = React.useMemo(
    () => buildOverviewRows(project.tasks ?? []),
    [project.tasks],
  );

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">
        Project Overview
      </h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <OverviewItem label="Project Name" value={project.name} />
        <OverviewItem
          label="Description"
          value={project.description || "No description"}
        />
        <OverviewItem label="Status" value={formatLabel(project.status)} />
        <OverviewItem
          label="Owner"
          value={
            project.owner
              ? `${project.owner.firstName} ${project.owner.lastName}`
              : "Unassigned"
          }
        />
        <OverviewItem
          label="Business Owner"
          value={formatUser(project.businessOwner)}
        />
        <OverviewItem
          label="Executive Sponsor"
          value={formatUser(project.executiveSponsor)}
        />
        <OverviewItem
          label="Delivery Lead"
          value={formatUser(project.deliveryLead)}
        />
        <OverviewItem
          label="Team Size"
          value={String(project.members?.length ?? 0)}
        />
      </dl>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-950">
            Work Breakdown Structure
          </h3>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {project.tasks?.length ?? 0}
          </span>
        </div>
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
          <div className="grid min-w-[760px] grid-cols-[90px_minmax(280px,1fr)_120px_120px_120px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <span>WBS</span>
            <span>Name</span>
            <span>Type</span>
            <span>Status</span>
            <span>Owner</span>
          </div>
          {overviewRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              <p className="font-semibold text-slate-700">No Tasks</p>
              <p className="mt-1">
                Planning hierarchy will appear here once tasks are added.
              </p>
            </div>
          ) : (
            overviewRows.map(({ depth, task, wbs }) => (
              <div
                className="grid min-w-[760px] grid-cols-[90px_minmax(280px,1fr)_120px_120px_120px] items-center border-b border-slate-100 px-3 py-2 text-sm last:border-b-0"
                key={task.id}
              >
                <span className="font-mono text-xs font-semibold text-slate-500">
                  {wbs}
                </span>
                <span
                  className="min-w-0 truncate font-semibold text-slate-900"
                  style={{ paddingLeft: depth * 18 }}
                  title={task.title}
                >
                  {hasChildren(project.tasks ?? [], task.id) ? "▸ " : ""}
                  {task.title}
                </span>
                <span className="capitalize text-slate-600">
                  {formatTaskKind(project.tasks ?? [], task)}
                </span>
                <span className="capitalize text-slate-600">
                  {formatLabel(task.status)}
                </span>
                <span className="truncate text-slate-600">
                  {formatTaskOwner(task)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-semibold capitalize text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatUser(
  user?: {
    firstName: string;
    lastName: string;
  } | null,
) {
  return user ? `${user.firstName} ${user.lastName}` : 'Unassigned';
}

type OverviewTaskRow = {
  depth: number;
  task: ApiTask;
  wbs: string;
};

function buildOverviewRows(tasks: ApiTask[]): OverviewTaskRow[] {
  const rows: OverviewTaskRow[] = [];
  const tasksByParentId = new Map<string | null, ApiTask[]>();

  tasks.forEach((task) => {
    const parentTaskId = task.parentTaskId ?? null;
    tasksByParentId.set(parentTaskId, [
      ...(tasksByParentId.get(parentTaskId) ?? []),
      task,
    ]);
  });

  tasksByParentId.forEach((siblings) => siblings.sort(compareTaskOrder));

  function visit(parentTaskId: string | null, depth: number, prefix: number[]) {
    (tasksByParentId.get(parentTaskId) ?? []).forEach((task, index) => {
      const wbsParts = [...prefix, index + 1];
      rows.push({ depth, task, wbs: wbsParts.join(".") });
      visit(task.id, depth + 1, wbsParts);
    });
  }

  visit(null, 0, []);
  return rows;
}

function compareTaskOrder(left: ApiTask, right: ApiTask) {
  const leftSequence =
    typeof left.sequenceNumber === "number" ? left.sequenceNumber : 999_999;
  const rightSequence =
    typeof right.sequenceNumber === "number" ? right.sequenceNumber : 999_999;
  return leftSequence - rightSequence || left.title.localeCompare(right.title);
}

function hasChildren(tasks: ApiTask[], taskId: string) {
  return tasks.some((task) => task.parentTaskId === taskId);
}

function formatTaskKind(tasks: ApiTask[], task: ApiTask) {
  if (hasChildren(tasks, task.id) || task.taskKind === "summary") {
    return "summary";
  }

  return task.taskKind ?? "standard";
}

function formatTaskOwner(task: ApiTask) {
  return task.assignee
    ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim() ||
        task.assignee.email
    : "Unassigned";
}
