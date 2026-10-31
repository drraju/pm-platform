"use client";

import React, { useState } from "react";
import type { ApiTask } from "@/features/projects";
import { outlinePlan } from "@/features/work/plan-outline";
import {
  containerProgress,
  isOverdueWork,
  isWorkContainer,
  storedWorkStatus,
  workStatusOptions,
} from "@/features/work/work-count";
import { waitingLines, type WaitingDependency, type WaitingLine } from "@/features/work/waiting-on";

type BoardMember = {
  role?: string;
  user?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  userId: string;
};

function personName(person?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null) {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return name || person?.email || "Unassigned";
}

const groupAccents = [
  { bar: "border-l-fuchsia-500", title: "text-fuchsia-700" },
  { bar: "border-l-sky-500", title: "text-sky-700" },
  { bar: "border-l-violet-500", title: "text-violet-700" },
  { bar: "border-l-teal-600", title: "text-teal-800" },
];

export function statusTone(status?: string | null) {
  const stored = storedWorkStatus(status);
  if (stored === "done") return "bg-emerald-600 text-white border-emerald-700";
  if (stored === "in_progress") return "bg-sky-600 text-white border-sky-700";
  if (stored === "blocked") return "bg-amber-400 text-amber-950 border-amber-500";
  return "bg-slate-200 text-slate-800 border-slate-300";
}

type TodayProjectBoardProps = {
  canAdd: boolean;
  canAssign?: boolean;
  canEdit: (task: ApiTask) => boolean;
  dependencies?: WaitingDependency[];
  isSaving: boolean;
  members?: BoardMember[];
  onAddSubtask: (input: { parentTaskId: string; title: string }) => Promise<void>;
  onOpen: (task: ApiTask) => void;
  onUpdate: (
    task: ApiTask,
    patch: {
      assigneeId?: string | null;
      dueDate?: string | null;
      nextStep?: string | null;
      status?: ApiTask["status"];
    },
  ) => Promise<void>;
  tasks: ApiTask[];
  today: string;
};

type Group = {
  id: string;
  rows: Array<{ depth: number; task: ApiTask }>;
  title: string;
};

function projectGroups(tasks: ApiTask[]): Group[] {
  const groups: Group[] = [];
  const loose: Group["rows"] = [];
  let current: Group | null = null;

  for (const row of outlinePlan(tasks)) {
    if (row.depth === 0 && isWorkContainer(row.task, tasks)) {
      current = { id: row.task.id, rows: [], title: row.task.title };
      groups.push(current);
      continue;
    }
    if (row.depth === 0) {
      current = null;
      loose.push(row);
      continue;
    }
    if (current) {
      current.rows.push({ depth: row.depth - 1, task: row.task });
    } else {
      loose.push(row);
    }
  }

  if (loose.length > 0) {
    groups.unshift({ id: "work", rows: loose, title: "Work" });
  }
  return groups;
}

export function TodayProjectBoard({
  canAdd,
  canAssign = false,
  canEdit,
  dependencies = [],
  isSaving,
  members = [],
  onAddSubtask,
  onOpen,
  onUpdate,
  tasks,
  today,
}: TodayProjectBoardProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [draftParentId, setDraftParentId] = useState<string | null>(null);
  const groups = projectGroups(tasks);

  if (groups.length === 0) {
    return <p className="px-4 py-6 text-sm text-slate-500">This project has no work items yet.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group, index) => {
        const accent = groupAccents[index % groupAccents.length];
        const progress = group.id === "work" ? null : containerProgress(group.id, tasks);
        const hidden = collapsed.has(group.id);
        return (
          <section
            className={`overflow-hidden rounded-md border border-slate-200 border-l-4 bg-white ${accent.bar}`}
            key={group.id}
          >
            <header className="flex items-center justify-between gap-3 px-3 py-2">
              <button
                className={`text-left text-sm font-semibold ${accent.title}`}
                onClick={() =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
                    return next;
                  })
                }
                type="button"
              >
                {hidden ? "▸" : "▾"} {group.title}
                {progress ? (
                  <span className="ml-2 text-xs font-medium text-slate-500">
                    {progress.done}/{progress.total}
                  </span>
                ) : null}
              </button>
              {canAdd && group.id !== "work" ? (
                <button
                  className="text-xs font-semibold text-teal-800"
                  onClick={() => setDraftParentId(group.id)}
                  type="button"
                >
                  Add subtask
                </button>
              ) : null}
            </header>
            {hidden ? null : (
              <table className="w-full table-fixed border-t border-slate-100 text-sm">
                <colgroup>
                  <col className="w-[32%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-semibold">Task</th>
                    <th className="px-2 py-2 font-semibold">Owner</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold">Due</th>
                    <th className="px-2 py-2 font-semibold">Next step</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map(({ depth, task }) => (
                    <TaskLine
                      canAdd={canAdd}
                      canAssign={canAssign}
                      canEdit={canEdit(task)}
                      dependencies={dependencies}
                      depth={depth}
                      members={members}
                      drafting={draftParentId === task.id}
                      isContainer={isWorkContainer(task, tasks)}
                      isSaving={isSaving}
                      key={task.id}
                      onAddSubtask={onAddSubtask}
                      onBeginSubtask={() => setDraftParentId(task.id)}
                      onCancelSubtask={() => setDraftParentId(null)}
                      onOpen={() => onOpen(task)}
                      onUpdate={onUpdate}
                      overdue={isOverdueWork(task, tasks, today)}
                      task={task}
                      tasks={tasks}
                      today={today}
                    />
                  ))}
                  {draftParentId === group.id ? (
                    <tr>
                      <td className="px-3 py-2" colSpan={5}>
                        <SubtaskDraft
                          isSaving={isSaving}
                          onCancel={() => setDraftParentId(null)}
                          onSubmit={(title) => onAddSubtask({ parentTaskId: group.id, title })}
                          parentTitle={group.title}
                        />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}

function TaskLine({
  canAdd,
  canAssign,
  canEdit,
  dependencies,
  depth,
  drafting,
  isContainer,
  isSaving,
  members,
  onAddSubtask,
  onBeginSubtask,
  onCancelSubtask,
  onOpen,
  onUpdate,
  overdue,
  task,
  tasks,
  today,
}: {
  canAdd: boolean;
  canAssign: boolean;
  canEdit: boolean;
  dependencies: WaitingDependency[];
  depth: number;
  drafting: boolean;
  isContainer: boolean;
  isSaving: boolean;
  members: BoardMember[];
  onAddSubtask: TodayProjectBoardProps["onAddSubtask"];
  onBeginSubtask: () => void;
  onCancelSubtask: () => void;
  onOpen: () => void;
  onUpdate: TodayProjectBoardProps["onUpdate"];
  overdue: boolean;
  task: ApiTask;
  tasks: ApiTask[];
  today: string;
}) {
  const nextStep = task.nextStep || task.latestExecutionUpdate?.nextStep || "";
  const childCount = tasks.filter((item) => item.parentTaskId === task.id).length;
  const assignable = members.filter((member) => member.role !== "viewer");
  const waiting = waitingLines(task.id, dependencies, tasks, today);

  return (
    <>
      <tr className="border-t border-slate-100">
        <td className="px-3 py-2">
          <div className="min-w-0" style={{ paddingLeft: depth * 16 }}>
            <button className="truncate text-left font-medium text-slate-950" onClick={onOpen} type="button">
              {task.title}
            </button>
            {childCount > 0 ? (
              <span className="ml-2 rounded bg-slate-100 px-1.5 text-xs text-slate-600">{childCount}</span>
            ) : null}
            {canAdd ? (
              <button
                aria-label={`Add subtask under ${task.title}`}
                className="ml-2 text-xs font-semibold text-teal-800"
                onClick={onBeginSubtask}
                type="button"
              >
                Add subtask
              </button>
            ) : null}
            <WaitingNotes lines={waiting} />
          </div>
        </td>
        <td className="px-2 py-2 align-middle">
          {canAssign && assignable.length > 0 ? (
            <select
              aria-label={`Owner for ${task.title}`}
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-900"
              disabled={isSaving}
              onChange={(event) => void onUpdate(task, { assigneeId: event.target.value || null })}
              value={task.assigneeId ?? ""}
            >
              <option value="">Unassigned</option>
              {task.assigneeId && !assignable.some((member) => member.userId === task.assigneeId) ? (
                <option value={task.assigneeId}>{personName(task.assignee)}</option>
              ) : null}
              {assignable.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {personName(member.user)}
                </option>
              ))}
            </select>
          ) : (
            <span className="block truncate text-xs text-slate-700">{personName(task.assignee)}</span>
          )}
        </td>
        <td className="px-2 py-2">
          {isContainer ? (
            <span className="text-xs text-slate-500">
              {containerProgress(task.id, tasks).done}/{containerProgress(task.id, tasks).total}
            </span>
          ) : (
            <select
              aria-label={`Status for ${task.title}`}
              className={`w-full rounded-md border px-2 py-1 text-xs font-semibold ${statusTone(task.status)}`}
              disabled={!canEdit || isSaving}
              onChange={(event) =>
                void onUpdate(task, { status: storedWorkStatus(event.target.value) as ApiTask["status"] })
              }
              value={storedWorkStatus(task.status)}
            >
              {workStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </td>
        <td className="px-2 py-2">
          {isContainer ? null : (
            <input
              aria-label={`Due date for ${task.title}`}
              className={`w-full rounded-md border px-2 py-1 text-xs ${
                task.status === "done"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : overdue
                    ? "border-rose-300 bg-rose-50 font-semibold text-rose-800"
                    : "border-slate-300 text-slate-800"
              }`}
              disabled={!canEdit || isSaving}
              onChange={(event) => void onUpdate(task, { dueDate: event.target.value || null })}
              type="date"
              value={task.dueDate?.slice(0, 10) ?? ""}
            />
          )}
        </td>
        <td className="px-2 py-2">
          {isContainer ? null : (
            <input
              aria-label={`Next step for ${task.title}`}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
              defaultValue={nextStep}
              disabled={!canEdit || isSaving}
              key={`${task.id}-${nextStep}`}
              onBlur={(event) => {
                if (event.target.value !== nextStep) void onUpdate(task, { nextStep: event.target.value });
              }}
              placeholder="What is left"
            />
          )}
        </td>
      </tr>
      {drafting ? (
        <tr>
          <td className="px-3 py-2" colSpan={5}>
            <SubtaskDraft
              isSaving={isSaving}
              onCancel={onCancelSubtask}
              onSubmit={(title) => onAddSubtask({ parentTaskId: task.id, title })}
              parentTitle={task.title}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function WaitingNotes({ lines }: { lines: WaitingLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {lines.map((line) => (
        <p className={`truncate text-xs ${waitingTone(line.state)}`} key={line.id}>
          {line.text}
        </p>
      ))}
    </div>
  );
}

function waitingTone(state: WaitingLine["state"]) {
  if (state === "blocked") return "font-medium text-amber-800";
  if (state === "overdue") return "font-medium text-rose-700";
  if (state === "done") return "text-emerald-700";
  return "text-slate-500";
}

function SubtaskDraft({
  isSaving,
  onCancel,
  onSubmit,
  parentTitle,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (title: string) => Promise<void>;
  parentTitle: string;
}) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = title.trim();
        if (!next) return;
        void onSubmit(next).then(() => setTitle(""));
      }}
    >
      <input
        aria-label={`Subtask under ${parentTitle}`}
        className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-sm"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Subtask"
        value={title}
      />
      <button
        aria-label={`Save subtask under ${parentTitle}`}
        className="text-sm font-semibold text-teal-800 disabled:opacity-40"
        disabled={isSaving || !title.trim()}
        type="submit"
      >
        Add subtask
      </button>
      <button className="text-sm text-slate-600" onClick={onCancel} type="button">
        Cancel
      </button>
    </form>
  );
}
