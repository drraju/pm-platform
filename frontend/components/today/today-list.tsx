"use client";

import React, { useEffect, useState } from "react";
import { HoldingNotes, statusTone, TodayProjectBoard, WaitingNotes } from "@/components/today/today-project-board";
import { WorkPanel } from "@/components/work/work-panel";
import type { ApiProject, ApiTask, ApiTaskExecutionUpdate } from "@/features/projects";
import {
  containerProgress,
  isOverdueWork,
  isWorkContainer,
  storedWorkStatus,
  todayDate,
  workStatusOptions,
  type WorkCount,
} from "@/features/work/work-count";
import { holdingLines, waitingLines, type WaitingDependency } from "@/features/work/waiting-on";

type TodayListProps = {
  canAdd: boolean;
  canAssign?: boolean;
  canEdit: (task: ApiTask) => boolean;
  containers: ApiTask[];
  count: WorkCount;
  dependencies?: WaitingDependency[];
  error: string | null;
  isSaving: boolean;
  members?: Array<{
    role?: string;
    user?: { firstName?: string | null; lastName?: string | null } | null;
    userId: string;
  }>;
  onAdd: (input: { dueDate?: string; projectId: string; title: string }) => Promise<void>;
  onAddSubtask?: (input: { parentTaskId: string; title: string }) => Promise<void>;
  onComment: (taskId: string, body: string) => Promise<void>;
  onLoadComments: (taskId: string) => Promise<ApiTaskExecutionUpdate[]>;
  openTaskId?: string | null;
  onScopeChange: (scope: string) => void;
  onUpdate: (task: ApiTask, patch: { dueDate?: string | null; nextStep?: string | null; status?: ApiTask["status"]; title?: string; assigneeId?: string | null }) => Promise<void>;
  projects: ApiProject[];
  rows: ApiTask[];
  scope: string;
  tasks: ApiTask[];
};

export function TodayList({
  canAdd,
  canAssign = false,
  canEdit,
  containers,
  count,
  dependencies = [],
  error,
  isSaving,
  members,
  onAdd,
  onAddSubtask,
  onComment,
  onLoadComments,
  openTaskId,
  onScopeChange,
  onUpdate,
  projects,
  rows,
  scope,
  tasks,
}: TodayListProps) {
  const today = todayDate();
  const [openId, setOpenId] = useState<string | null>(openTaskId ?? null);
  useEffect(() => {
    if (openTaskId) setOpenId(openTaskId);
  }, [openTaskId]);
  const [showContainers, setShowContainers] = useState(false);
  const openTask = tasks.find((task) => task.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Today</h1>
          <p className="mt-1 text-sm text-slate-600">{count.line}</p>
        </div>
        <label className="text-sm font-medium text-slate-700">
          Scope
          <select
            aria-label="Scope"
            className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onChange={(event) => onScopeChange(event.target.value)}
            value={scope}
          >
            <option value="mine">Mine</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {scope === "mine" ? (
        <p className="text-sm text-slate-600">
          Choose a project to update its tasks, owner, status, and subtasks here.
        </p>
      ) : null}

      {canAdd ? <AddWork isSaving={isSaving} onAdd={onAdd} projects={projects} selectedProjectId={scope === "mine" ? "" : scope} /> : null}

      {scope !== "mine" && onAddSubtask ? (
        <TodayProjectBoard
          canAdd={canAdd}
          canAssign={canAssign}
          canEdit={canEdit}
          dependencies={dependencies}
          members={members}
          isSaving={isSaving}
          onAddSubtask={onAddSubtask}
          onOpen={(task) => setOpenId(task.id)}
          onUpdate={onUpdate}
          tasks={tasks}
          today={today}
        />
      ) : (
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="hidden border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,1.5fr)_8rem_7.5rem_minmax(0,1fr)]">
          <span>Work</span>
          <span>Status</span>
          <span>Due</span>
          <span>Next step</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            {scope === "mine" ? "Nothing is assigned to you." : "This project has no work items yet."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((task) => (
              <WorkRow
                canEdit={canEdit(task)}
                dependencies={dependencies}
                isSaving={isSaving}
                key={task.id}
                onOpen={() => setOpenId(task.id)}
                onUpdate={onUpdate}
                overdue={isOverdueWork(task, tasks, today)}
                task={task}
                tasks={tasks}
                today={today}
              />
            ))}
          </ul>
        )}
      </section>
      )}

      {scope === "mine" && containers.length > 0 ? (
        <section className="rounded-md border border-slate-200 bg-white">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800"
            onClick={() => setShowContainers((current) => !current)}
            type="button"
          >
            Containers
            <span className="text-xs font-medium text-slate-500">{showContainers ? "Hide" : "Show"}</span>
          </button>
          {showContainers ? (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {containers.map((task) => {
                const progress = containerProgress(task.id, tasks);
                return (
                  <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm" key={task.id}>
                    <span className="font-medium text-slate-900">{task.title}</span>
                    <span className="text-slate-500">{progress.done}/{progress.total}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}

      {openTask ? (
        <WorkPanel
          canAssign={canAssign}
          canComment={!isWorkContainer(openTask, tasks)}
          canEditTitle={canEdit(openTask)}
          isSaving={isSaving}
          members={members}
          onClose={() => setOpenId(null)}
          onComment={onComment}
          onLoadComments={onLoadComments}
          onUpdate={onUpdate}
          task={openTask}
        />
      ) : null}
    </div>
  );
}

function WorkRow({
  canEdit,
  dependencies,
  isSaving,
  onOpen,
  onUpdate,
  overdue,
  task,
  tasks,
  today,
}: {
  canEdit: boolean;
  dependencies: WaitingDependency[];
  isSaving: boolean;
  onOpen: () => void;
  onUpdate: TodayListProps["onUpdate"];
  overdue: boolean;
  task: ApiTask;
  tasks: ApiTask[];
  today: string;
}) {
  const nextStep = task.nextStep || task.latestExecutionUpdate?.nextStep || "";
  const owner = personName(task.assignee);

  return (
    <li className="grid gap-2 px-3 py-3 md:grid-cols-[minmax(0,1.5fr)_8rem_7.5rem_minmax(0,1fr)] md:items-center">
      <div className="min-w-0">
        <button className="truncate text-left text-sm font-semibold text-slate-950 hover:text-brand" onClick={onOpen} type="button">
          {task.title}
        </button>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {task.project?.name ?? "Project"} · {task.project?.customer?.name ?? "No customer"} · {owner}
        </p>
        <WaitingNotes lines={waitingLines(task.id, dependencies, tasks, today)} />
        <HoldingNotes lines={holdingLines(task.id, dependencies, tasks)} />
      </div>
      <select
        aria-label={`Status for ${task.title}`}
        className={`w-full rounded-md border px-2 py-1.5 text-sm font-semibold disabled:opacity-60 ${statusTone(task.status)}`}
        disabled={!canEdit || isSaving}
        onChange={(event) => void onUpdate(task, { status: storedWorkStatus(event.target.value) as ApiTask["status"] })}
        value={storedWorkStatus(task.status)}
      >
        {workStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <label className="text-xs text-slate-500">
        <span className="sr-only">Due date for {task.title}</span>
        <input
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
          disabled={!canEdit || isSaving}
          onChange={(event) => void onUpdate(task, { dueDate: event.target.value || null })}
          type="date"
          value={task.dueDate?.slice(0, 10) ?? ""}
        />
        {overdue ? <span className="mt-1 block font-medium text-red-700">Overdue</span> : null}
      </label>
      <input
        aria-label={`Next step for ${task.title}`}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-50"
        defaultValue={nextStep}
        disabled={!canEdit || isSaving}
        key={`${task.id}-${nextStep}`}
        onBlur={(event) => {
          if (event.target.value !== nextStep) {
            void onUpdate(task, { nextStep: event.target.value });
          }
        }}
        placeholder="Next step"
      />
    </li>
  );
}

function AddWork({
  isSaving,
  onAdd,
  projects,
  selectedProjectId,
}: {
  isSaving: boolean;
  onAdd: TodayListProps["onAdd"];
  projects: ApiProject[];
  selectedProjectId: string;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(selectedProjectId);
  const [dueDate, setDueDate] = useState("");

  return (
    <form
      className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_9rem_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const chosen = projectId || selectedProjectId;
        if (!title.trim() || !chosen) return;
        void onAdd({ dueDate: dueDate || undefined, projectId: chosen, title: title.trim() }).then(() => {
          setTitle("");
          setDueDate("");
        });
      }}
    >
      <input
        aria-label="Work title"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add work"
        value={title}
      />
      <select
        aria-label="Project for new work"
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        onChange={(event) => setProjectId(event.target.value)}
        value={projectId || selectedProjectId}
      >
        <option value="">Project</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>
      <input
        aria-label="Due date for new work"
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        onChange={(event) => setDueDate(event.target.value)}
        type="date"
        value={dueDate}
      />
      <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={isSaving || !title.trim()} type="submit">
        Add
      </button>
    </form>
  );
}

function personName(person?: { email?: string; firstName?: string; lastName?: string } | null) {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return name || person?.email || "Unassigned";
}
