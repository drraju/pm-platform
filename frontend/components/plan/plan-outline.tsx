"use client";

import React, { useState } from "react";
import type { ApiProjectMember, ApiTask } from "@/features/projects";
import {
  containerProgress,
  countWork,
  isOverdueWork,
  isWorkContainer,
  storedWorkStatus,
  workStatusLabel,
  workStatusOptions,
} from "@/features/work/work-count";
import { outlinePlan, planParentId } from "@/features/work/plan-outline";

type PlanPatch = {
  assigneeId?: string | null;
  dueDate?: string | null;
  sequenceNumber?: number;
  startDate?: string | null;
  status?: ApiTask["status"];
};

type PlanMember = Pick<ApiProjectMember, "role" | "user" | "userId">;

export function PlanOutline({
  canAdd,
  canEditDates,
  canEditStatus,
  isSaving,
  members,
  onAdd,
  onOpen,
  onReorder,
  onUpdate,
  tasks,
  today,
}: {
  canAdd: boolean;
  canEditDates: boolean;
  canEditStatus: (task: ApiTask) => boolean;
  isSaving: boolean;
  members?: PlanMember[];
  onAdd: (input: { parentTaskId?: string; title: string }) => Promise<void>;
  onOpen?: (task: ApiTask) => void;
  onReorder: (draggedId: string, targetId: string) => Promise<void>;
  onUpdate: (task: ApiTask, patch: PlanPatch) => Promise<void>;
  tasks: ApiTask[];
  today: string;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [draftParentId, setDraftParentId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const rows = outlinePlan(tasks).filter(({ task }) => !hasCollapsedAncestor(task, tasks, collapsed));
  const containers = tasks.filter((task) => isWorkContainer(task, tasks)).length;
  const work = countWork(tasks, today);
  const containerWord = containers === 1 ? "container" : "containers";
  const summary = `${work.line} · ${containers} ${containerWord}`;
  const assignable = (members ?? []).filter((member) => member.role !== "viewer");

  function beginSubtask(parentId: string) {
    setCollapsed((current) => {
      if (!current.has(parentId)) return current;
      const next = new Set(current);
      next.delete(parentId);
      return next;
    });
    setDraftParentId(parentId);
  }

  const draftAfter = draftParentId ? lastDescendantIndex(rows, tasks, draftParentId) : -1;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-8" />
          <col />
          <col className="w-14" />
          <col className="w-40" />
          <col className="w-40" />
          <col className="w-44" />
          <col className="w-32" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
            <th className="px-2 py-2"><span className="sr-only">Order</span></th>
            <th className="px-2 py-2 font-medium">Title</th>
            <th className="px-1 py-2"><span className="sr-only">Subtask</span></th>
            <th className="px-2 py-2 font-medium">Owner</th>
            <th className="px-2 py-2 font-medium">Start</th>
            <th className="px-2 py-2 font-medium">Finish</th>
            <th className="px-2 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-sm text-slate-600" colSpan={7}>
                {canAdd ? "Nothing is on this plan yet. Add the first line, then set the owner and dates." : "This project has no work items yet."}
                {canAdd ? <AddWork isSaving={isSaving} onAdd={onAdd} /> : null}
              </td>
            </tr>
          ) : (
            rows.map(({ depth, task }, index) => {
              const container = isWorkContainer(task, tasks);
              return (
                <React.Fragment key={task.id}>
                  <PlanRow
                    assignable={assignable}
                    canAdd={canAdd}
                    canEditDates={canEditDates}
                    canEditStatus={canEditStatus(task)}
                    collapsed={collapsed.has(task.id)}
                    depth={depth}
                    dragOver={dragOverId === task.id}
                    isContainer={container}
                    isSaving={isSaving}
                    onBeginSubtask={() => beginSubtask(task.id)}
                    onOpen={onOpen}
                    onReorder={onReorder}
                    onToggle={() =>
                      setCollapsed((current) => {
                        const next = new Set(current);
                        if (next.has(task.id)) next.delete(task.id);
                        else next.add(task.id);
                        return next;
                      })
                    }
                    onUpdate={onUpdate}
                    overdue={isOverdueWork(task, tasks, today)}
                    progress={container ? containerProgress(task.id, tasks) : null}
                    setDragOverId={setDragOverId}
                    task={task}
                  />
                  {index + 1 === draftAfter && draftParentId ? (
                    <DraftRow
                      depth={depthOf(tasks, draftParentId) + 1}
                      isSaving={isSaving}
                      onCancel={() => setDraftParentId(null)}
                      onSave={async (title) => {
                        await onAdd({ parentTaskId: draftParentId, title });
                        setDraftParentId(null);
                      }}
                    />
                  ) : null}
                </React.Fragment>
              );
            })
          )}
          {rows.length > 0 && canAdd ? (
            <tr className="border-t border-slate-100">
              <td />
              <td className="px-2" colSpan={6}>
                <AddWork isSaving={isSaving} onAdd={onAdd} />
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">{summary}</p>
    </section>
  );
}

function PlanRow({
  assignable,
  canAdd,
  canEditDates,
  canEditStatus,
  collapsed,
  depth,
  dragOver,
  isContainer,
  isSaving,
  onBeginSubtask,
  onOpen,
  onReorder,
  onToggle,
  onUpdate,
  overdue,
  progress,
  setDragOverId,
  task,
}: {
  assignable: PlanMember[];
  canAdd: boolean;
  canEditDates: boolean;
  canEditStatus: boolean;
  collapsed: boolean;
  depth: number;
  dragOver: boolean;
  isContainer: boolean;
  isSaving: boolean;
  onBeginSubtask: () => void;
  onOpen?: (task: ApiTask) => void;
  onReorder: (draggedId: string, targetId: string) => Promise<void>;
  onToggle: () => void;
  onUpdate: (task: ApiTask, patch: PlanPatch) => Promise<void>;
  overdue: boolean;
  progress: { done: number; total: number } | null;
  setDragOverId: (id: string | null) => void;
  task: ApiTask;
}) {
  const done = storedWorkStatus(task.status) === "done";

  return (
    <tr
      className={`border-t border-slate-100 ${isContainer ? "bg-slate-50" : "bg-white"} ${dragOver ? "bg-teal-50" : ""}`}
      onDragOver={(event) => {
        if (!canEditDates) return;
        event.preventDefault();
        setDragOverId(task.id);
      }}
      onDragLeave={() => setDragOverId(null)}
      onDrop={(event) => {
        if (!canEditDates) return;
        event.preventDefault();
        setDragOverId(null);
        const draggedId = event.dataTransfer.getData("text/plain");
        if (draggedId) void onReorder(draggedId, task.id);
      }}
    >
      <td className="px-1 py-1.5 align-middle">
        {canEditDates ? (
          <button
            aria-label={`Reorder ${task.title}`}
            className="cursor-grab text-slate-300"
            draggable={!isSaving}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", task.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            type="button"
          >
            <GripIcon />
          </button>
        ) : null}
      </td>
      <td className="px-2 py-1.5 align-middle">
        <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: depth * 16 }}>
          {isContainer ? (
            <button
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? "Show" : "Hide"} ${task.title}`}
              className="grid size-5 shrink-0 place-items-center rounded text-slate-500 hover:bg-white"
              onClick={onToggle}
              type="button"
            >
              <ChevronIcon collapsed={collapsed} />
            </button>
          ) : (
            <span className="size-5 shrink-0" />
          )}
          {onOpen ? (
            <button
              className={`min-w-0 flex-1 truncate text-left ${isContainer ? "font-semibold text-slate-950" : done ? "text-slate-400 line-through" : "text-slate-800"}`}
              onClick={() => onOpen(task)}
              type="button"
            >
              {task.title}
            </button>
          ) : (
            <p className={`min-w-0 flex-1 truncate ${isContainer ? "font-semibold text-slate-950" : done ? "text-slate-400 line-through" : "text-slate-800"}`}>
              {task.title}
            </p>
          )}
        </div>
      </td>
      <td className="px-1 py-1.5 align-middle">
        {canAdd ? (
          <button
            aria-label={`Add subtask under ${task.title}`}
            className="rounded px-1 py-0.5 text-xs font-semibold text-teal-800 hover:bg-white"
            onClick={onBeginSubtask}
            type="button"
          >
            Add
          </button>
        ) : null}
      </td>
      <td className="px-2 py-1.5 align-middle">
        {canEditDates ? (
          <OwnerMenu
            assignable={assignable}
            disabled={isSaving}
            onChange={(assigneeId) => void onUpdate(task, { assigneeId })}
            person={task.assignee}
            title={task.title}
          />
        ) : (
          <span className="block truncate text-slate-700">{personName(task.assignee)}</span>
        )}
      </td>
      <td className="px-2 py-1.5 align-middle">
        <DateCell
          canEdit={canEditDates}
          isSaving={isSaving}
          label={`Start for ${task.title}`}
          onChange={(value) => void onUpdate(task, { startDate: value })}
          value={task.startDate}
        />
      </td>
      <td className="px-2 py-1.5 align-middle">
        <DateCell
          canEdit={canEditDates}
          isSaving={isSaving}
          label={`Finish for ${task.title}`}
          onChange={(value) => void onUpdate(task, { dueDate: value })}
          overdue={overdue}
          value={task.dueDate}
        />
      </td>
      <td className="px-2 py-1.5 align-middle">
        {isContainer ? (
          <span className="tabular-nums text-slate-500" title="Completed work over work in this container">
            {progress ? `${progress.done}/${progress.total}` : ""}
          </span>
        ) : canEditStatus ? (
          <StatusMenu
            disabled={isSaving}
            onChange={(status) => void onUpdate(task, { status })}
            status={task.status}
            title={task.title}
          />
        ) : (
          <StatusMark status={task.status} />
        )}
      </td>
    </tr>
  );
}

function OwnerMenu({
  assignable,
  disabled,
  onChange,
  person,
  title,
}: {
  assignable: PlanMember[];
  disabled: boolean;
  onChange: (assigneeId: string | null) => void;
  person?: ApiTask["assignee"];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const name = personName(person);

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Owner for ${title}`}
        className={`block w-full truncate rounded border border-slate-200 bg-white px-2 py-1 text-left text-sm hover:border-slate-400 ${
          person ? "text-slate-800" : "text-slate-500"
        }`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {person ? name : "Assign"}
      </button>
      {open ? (
        <ul className="absolute left-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg" role="listbox">
          <li>
            <button aria-selected={!person} className="block w-full px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50" onClick={() => { setOpen(false); onChange(null); }} role="option" type="button">
              Unassigned
            </button>
          </li>
          {assignable.length === 0 ? (
            <li className="px-3 py-1.5 text-sm text-slate-500">No members on this project yet.</li>
          ) : (
            assignable.map((member) => (
              <li key={member.userId}>
                <button
                  aria-selected={person?.id === member.userId}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                  onClick={() => { setOpen(false); onChange(member.userId); }}
                  role="option"
                  type="button"
                >
                  <span className="truncate">{personName(member.user)}</span>
                  <span className="shrink-0 text-xs text-slate-400">{membershipLabel(member.role)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function DraftRow({
  depth,
  isSaving,
  onCancel,
  onSave,
}: {
  depth: number;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");

  return (
    <tr className="border-t border-slate-100 bg-teal-50/40">
      <td />
      <td className="px-2 py-1.5" colSpan={6}>
        <form
          className="flex items-center gap-2"
          style={{ paddingLeft: depth * 16 }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim()) return;
            void onSave(title.trim());
          }}
        >
          <input
            aria-label="Subtask title"
            className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Subtask title"
            value={title}
          />
          <button className="text-sm font-semibold text-teal-800 disabled:opacity-40" disabled={isSaving || !title.trim()} type="submit">
            Add subtask
          </button>
          <button className="text-sm text-slate-500" onClick={onCancel} type="button">
            Cancel
          </button>
        </form>
      </td>
    </tr>
  );
}

function StatusMenu({
  disabled,
  onChange,
  status,
  title,
}: {
  disabled: boolean;
  onChange: (status: ApiTask["status"]) => void;
  status?: string | null;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Status for ${title}`}
        className="rounded-full px-1 py-0.5 hover:bg-slate-100 disabled:opacity-50"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <StatusMark status={status} />
      </button>
      {open ? (
        <ul className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-slate-200 bg-white py-1 shadow-lg" role="listbox">
          {workStatusOptions.map((option) => (
            <li key={option.value}>
              <button
                aria-selected={storedWorkStatus(status) === option.value}
                className="flex w-full px-2 py-1.5 text-left hover:bg-slate-50"
                onClick={() => {
                  setOpen(false);
                  onChange(option.value as ApiTask["status"]);
                }}
                role="option"
                type="button"
              >
                <StatusMark status={option.value} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StatusMark({ status }: { status?: string | null }) {
  const stored = storedWorkStatus(status);
  const dot =
    stored === "blocked" ? "bg-amber-500" : stored === "in_progress" ? "bg-teal-600" : stored === "done" ? "bg-slate-300" : "border border-slate-300 bg-white";
  const text = stored === "blocked" ? "text-amber-800" : stored === "in_progress" ? "text-teal-800" : stored === "done" ? "text-slate-400" : "text-slate-600";

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
      {workStatusLabel(stored)}
    </span>
  );
}

function DateCell({
  canEdit,
  isSaving,
  label,
  onChange,
  overdue = false,
  value,
}: {
  canEdit: boolean;
  isSaving: boolean;
  label: string;
  onChange: (value: string | null) => void;
  overdue?: boolean;
  value?: string | null;
}) {
  const shown = value?.slice(0, 10) ?? "";
  if (!canEdit) {
    return (
      <span className={`block truncate ${overdue ? "font-medium text-red-700" : "text-slate-700"}`}>
        {formatPlanDate(shown) || "—"}
        {overdue ? <span className="ml-1 text-[10px] uppercase tracking-wide">Overdue</span> : null}
      </span>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <input
        aria-label={label}
        className={`box-border w-full min-w-0 max-w-full rounded border bg-white px-1.5 py-1 text-xs ${
          overdue ? "border-red-300 text-red-700" : "border-slate-200 text-slate-800"
        }`}
        disabled={isSaving}
        onChange={(event) => onChange(event.target.value || null)}
        type="date"
        value={shown}
      />
      {overdue ? <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-red-700">Overdue</span> : null}
    </div>
  );
}

function AddWork({
  isSaving,
  onAdd,
}: {
  isSaving: boolean;
  onAdd: (input: { title: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");

  return (
    <form
      className="flex items-center gap-2 py-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        void onAdd({ title: title.trim() }).then(() => setTitle(""));
      }}
    >
      <input
        aria-label="Work title"
        className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="New work"
        value={title}
      />
      <button className="rounded-md px-2 py-1 text-sm font-semibold text-teal-800 disabled:opacity-40" disabled={isSaving || !title.trim()} type="submit">
        Add work
      </button>
    </form>
  );
}

function GripIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="currentColor" viewBox="0 0 16 16">
      <circle cx="5" cy="4" r="1.1" />
      <circle cx="11" cy="4" r="1.1" />
      <circle cx="5" cy="8" r="1.1" />
      <circle cx="11" cy="8" r="1.1" />
      <circle cx="5" cy="12" r="1.1" />
      <circle cx="11" cy="12" r="1.1" />
    </svg>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden="true" className={`size-3.5 ${collapsed ? "-rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 16 16">
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function lastDescendantIndex(rows: Array<{ task: ApiTask }>, tasks: readonly ApiTask[], parentId: string) {
  let last = rows.findIndex((row) => row.task.id === parentId);
  rows.forEach((row, index) => {
    if (isDescendant(row.task, parentId, tasks)) last = index;
  });
  return last + 1;
}

function isDescendant(task: ApiTask, ancestorId: string, tasks: readonly ApiTask[]) {
  let parentId = planParentId(task, tasks);
  const seen = new Set<string>();
  while (parentId && !seen.has(parentId)) {
    if (parentId === ancestorId) return true;
    seen.add(parentId);
    const parent = tasks.find((item) => item.id === parentId);
    parentId = parent ? planParentId(parent, tasks) : null;
  }
  return false;
}

function depthOf(tasks: readonly ApiTask[], taskId: string) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return 0;
  let depth = 0;
  let parentId = planParentId(task, tasks);
  const seen = new Set<string>();
  while (parentId && !seen.has(parentId)) {
    depth += 1;
    seen.add(parentId);
    const parent = tasks.find((item) => item.id === parentId);
    parentId = parent ? planParentId(parent, tasks) : null;
  }
  return depth;
}

function hasCollapsedAncestor(task: ApiTask, tasks: readonly ApiTask[], collapsed: ReadonlySet<string>) {
  let parentId = planParentId(task, tasks);
  const seen = new Set<string>();
  while (parentId && !seen.has(parentId)) {
    if (collapsed.has(parentId)) return true;
    seen.add(parentId);
    const parent = tasks.find((item) => item.id === parentId);
    parentId = parent ? planParentId(parent, tasks) : null;
  }
  return false;
}

function formatPlanDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function membershipLabel(role: string) {
  if (role === "owner" || role === "manager") return "Lead";
  if (role === "contributor") return "Contributor";
  if (role === "viewer") return "Viewer";
  return role;
}

function personName(person?: { email?: string; firstName?: string; lastName?: string } | null) {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return name || person?.email || "Unassigned";
}
