"use client";

import React, { useState } from "react";
import type { ApiTask } from "@/features/projects";
import { isSubtask } from "@/features/work/outline-role";
import {
  countTodayFilters,
  doneContainerIds,
  todayContainerIds,
  todayFilterLabel,
  todayFilters,
  todaySections,
  type TodayFilter,
} from "@/features/work/today-outline";
import {
  containerProgress,
  isOverdueWork,
  isWorkContainer,
  storedWorkStatus,
  workStatusOptions,
  type StatusMix,
} from "@/features/work/work-count";
import {
  holdingLines,
  waitingLines,
  type HoldingLine,
  type WaitingDependency,
  type WaitingLine,
} from "@/features/work/waiting-on";

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

export function StatusFilterBar({
  counts,
  onChange,
  value,
}: {
  counts: Record<TodayFilter, number>;
  onChange: (filter: TodayFilter) => void;
  value: TodayFilter;
}) {
  return (
    <div aria-label="Status" className="flex flex-wrap gap-1.5" role="group">
      {todayFilters.map((filter) => {
        const selected = filter === value;
        return (
          <button
            aria-pressed={selected}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              selected ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
            key={filter}
            onClick={() => onChange(filter)}
            type="button"
          >
            {todayFilterLabel[filter]}{" "}
            <span className={`tabular-nums ${selected ? "text-slate-200" : "text-slate-500"}`}>{counts[filter]}</span>
          </button>
        );
      })}
    </div>
  );
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
  const containerKey = todayContainerIds(tasks).join("|");
  const [knownContainers, setKnownContainers] = useState(containerKey);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(doneContainerIds(tasks)));
  if (knownContainers !== containerKey) {
    const previous = new Set(knownContainers ? knownContainers.split("|") : []);
    const arrived = containerKey.split("|").filter((id) => id && !previous.has(id));
    const done = new Set(doneContainerIds(tasks));
    const present = new Set(containerKey ? containerKey.split("|") : []);
    setKnownContainers(containerKey);
    setCollapsed((current) => {
      const next = new Set([...current].filter((id) => present.has(id)));
      for (const id of arrived) {
        if (done.has(id)) next.add(id);
      }
      return next;
    });
  }
  const [draftParentId, setDraftParentId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TodayFilter>("open");
  const counts = countTodayFilters(tasks, today);
  const sections = todaySections(tasks, filter, collapsed, today);

  function toggle(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <StatusFilterBar counts={counts} onChange={setFilter} value={filter} />
      {sections.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">{emptyTodayFilterCopy(filter, tasks.length === 0)}</p>
      ) : null}
      {sections.map((section, index) => {
        const accent = groupAccents[index % groupAccents.length];
        const hidden = collapsed.has(section.id);
        return (
          <section
            className={`overflow-hidden rounded-md border border-slate-200 border-l-4 bg-white ${accent.bar}`}
            key={section.id}
          >
            <header className="flex items-center gap-2 px-3 py-2">
              <button
                aria-expanded={!hidden}
                aria-label={`${hidden ? "Show" : "Hide"} ${section.title}`}
                className={`text-left text-sm font-semibold ${accent.title}`}
                onClick={() => toggle(section.id)}
                type="button"
              >
                {hidden ? "▸" : "▾"} {section.title}
              </button>
              <span className="text-xs font-medium text-slate-500">
                {section.done}/{section.total}
              </span>
            </header>
            {hidden ? null : <StatusMixBar mix={section.mix} />}
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
                  {section.rows.map(({ depth, foldable, task }) => (
                    <TaskLine
                      canAdd={canAdd}
                      canAssign={canAssign}
                      canEdit={canEdit(task)}
                      collapsed={collapsed.has(task.id)}
                      dependencies={dependencies}
                      depth={depth}
                      members={members}
                      drafting={draftParentId === task.id}
                      foldable={foldable}
                      isContainer={isWorkContainer(task, tasks)}
                      isSaving={isSaving}
                      key={task.id}
                      onAddSubtask={onAddSubtask}
                      onBeginSubtask={() => setDraftParentId(task.id)}
                      onCancelSubtask={() => setDraftParentId(null)}
                      onOpen={() => onOpen(task)}
                      onToggle={() => toggle(task.id)}
                      onUpdate={onUpdate}
                      overdue={isOverdueWork(task, tasks, today)}
                      task={task}
                      tasks={tasks}
                      today={today}
                    />
                  ))}
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
  collapsed,
  dependencies,
  depth,
  drafting,
  foldable,
  isContainer,
  isSaving,
  members,
  onAddSubtask,
  onBeginSubtask,
  onCancelSubtask,
  onOpen,
  onToggle,
  onUpdate,
  overdue,
  task,
  tasks,
  today,
}: {
  canAdd: boolean;
  canAssign: boolean;
  canEdit: boolean;
  collapsed: boolean;
  dependencies: WaitingDependency[];
  depth: number;
  drafting: boolean;
  foldable: boolean;
  isContainer: boolean;
  isSaving: boolean;
  members: BoardMember[];
  onAddSubtask: TodayProjectBoardProps["onAddSubtask"];
  onBeginSubtask: () => void;
  onCancelSubtask: () => void;
  onOpen: () => void;
  onToggle: () => void;
  onUpdate: TodayProjectBoardProps["onUpdate"];
  overdue: boolean;
  task: ApiTask;
  tasks: ApiTask[];
  today: string;
}) {
  const nextStep = task.nextStep || task.latestExecutionUpdate?.nextStep || "";
  const assignable = members.filter((member) => member.role !== "viewer");
  const waiting = waitingLines(task.id, dependencies, tasks, today);
  const holding = holdingLines(task.id, dependencies, tasks);
  const canAddSubtask = canAdd && !isSubtask(task, tasks);

  return (
    <>
      <tr className="border-t border-slate-100">
        <td className="px-3 py-2">
          <div className="flex min-w-0 items-center gap-1" style={{ paddingLeft: depth * 16 }}>
            {foldable ? (
              <button
                aria-expanded={!collapsed}
                aria-label={`${collapsed ? "Show" : "Hide"} subtasks of ${task.title}`}
                className="shrink-0 px-0.5 text-slate-500"
                onClick={onToggle}
                type="button"
              >
                {collapsed ? "▸" : "▾"}
              </button>
            ) : depth > 0 ? (
              <span className="inline-block w-3 shrink-0" />
            ) : null}
            <button className="truncate text-left font-medium text-slate-950" onClick={onOpen} type="button">
              {task.title}
            </button>
            {canAddSubtask ? (
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
            <HoldingNotes lines={holding} />
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

export function HoldingNotes({ lines }: { lines: HoldingLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {lines.map((line) => (
        <p className="truncate text-xs text-slate-600" key={line.id}>
          {line.text}
        </p>
      ))}
    </div>
  );
}

function StatusMixBar({ mix }: { mix: StatusMix }) {
  if (mix.total === 0) return null;
  const parts = [
    { className: "bg-emerald-600", count: mix.done, label: "Done" },
    { className: "bg-sky-600", count: mix.doing, label: "Doing" },
    { className: "bg-amber-400", count: mix.blocked, label: "Blocked" },
    { className: "bg-slate-300", count: mix.notStarted, label: "Not started" },
  ].filter((part) => part.count > 0);
  return (
    <div
      aria-label={parts.map((part) => `${part.count} ${part.label}`).join(", ")}
      className="mx-3 mb-2 flex h-1.5 overflow-hidden rounded-full bg-slate-100"
      role="img"
    >
      {parts.map((part) => (
        <span className={`h-full ${part.className}`} key={part.label} style={{ flexGrow: part.count }} />
      ))}
    </div>
  );
}

function emptyTodayFilterCopy(filter: TodayFilter, projectEmpty: boolean) {
  if (projectEmpty || filter === "all") return "This project has no work items yet.";
  if (filter === "open") return "Nothing is still open.";
  if (filter === "todo") return "Nothing is waiting to start.";
  if (filter === "in_progress") return "Nothing is in progress.";
  if (filter === "blocked") return "Nothing is blocked.";
  if (filter === "overdue") return "Nothing is overdue.";
  return "Nothing is done.";
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
