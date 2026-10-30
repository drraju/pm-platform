"use client";

import React, { useEffect, useState } from "react";
import type { ApiProject, ApiTask, ApiTaskExecutionUpdate } from "@/features/projects";
import {
  containerProgress,
  isOverdueWork,
  storedWorkStatus,
  todayDate,
  workStatusLabel,
  workStatusOptions,
  type WorkCount,
} from "@/features/work/work-count";

type TodayListProps = {
  canAdd: boolean;
  canEdit: (task: ApiTask) => boolean;
  containers: ApiTask[];
  count: WorkCount;
  error: string | null;
  isSaving: boolean;
  onAdd: (input: { dueDate?: string; projectId: string; title: string }) => Promise<void>;
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
  canEdit,
  containers,
  count,
  error,
  isSaving,
  onAdd,
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

      {canAdd ? <AddWork isSaving={isSaving} onAdd={onAdd} projects={projects} selectedProjectId={scope === "mine" ? "" : scope} /> : null}

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
                isSaving={isSaving}
                key={task.id}
                onOpen={() => setOpenId(task.id)}
                onUpdate={onUpdate}
                overdue={isOverdueWork(task, tasks, today)}
                task={task}
              />
            ))}
          </ul>
        )}
      </section>

      {containers.length > 0 ? (
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
          canEdit={canEdit(openTask)}
          isSaving={isSaving}
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
  isSaving,
  onOpen,
  onUpdate,
  overdue,
  task,
}: {
  canEdit: boolean;
  isSaving: boolean;
  onOpen: () => void;
  onUpdate: TodayListProps["onUpdate"];
  overdue: boolean;
  task: ApiTask;
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
      </div>
      <select
        aria-label={`Status for ${task.title}`}
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-50"
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

function WorkPanel({
  canEdit,
  isSaving,
  onClose,
  onComment,
  onLoadComments,
  onUpdate,
  task,
}: {
  canEdit: boolean;
  isSaving: boolean;
  onClose: () => void;
  onComment: TodayListProps["onComment"];
  onLoadComments: TodayListProps["onLoadComments"];
  onUpdate: TodayListProps["onUpdate"];
  task: ApiTask;
}) {
  const [title, setTitle] = useState(task.title);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<ApiTaskExecutionUpdate[] | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setComments(null);
    onLoadComments(task.id)
      .then((updates) => {
        if (mounted) setComments(updates.filter((update) => update.updateNotes?.trim()));
      })
      .catch(() => {
        if (mounted) setComments([]);
      });
    return () => {
      mounted = false;
    };
  }, [onLoadComments, task.id]);

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">Work</h2>
        <button className="text-sm font-medium text-slate-600" onClick={onClose} type="button">Close</button>
      </div>
      <div className="space-y-4 overflow-y-auto px-4 py-4">
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            disabled={!canEdit || isSaving}
            onBlur={() => {
              if (title.trim() && title !== task.title) void onUpdate(task, { title });
            }}
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        <p className="text-sm text-slate-600">Owner: {personName(task.assignee)}</p>
        <p className="text-sm text-slate-600">Status stays {workStatusLabel(task.status)} until you change it in the list.</p>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const note = comment.trim();
            if (!note) return;
            void onComment(task.id, note)
              .then(() => onLoadComments(task.id))
              .then((updates) => {
                setComments(updates.filter((update) => update.updateNotes?.trim()));
                setComment("");
                setCommentError(null);
              })
              .catch((requestError: unknown) => {
                setCommentError(requestError instanceof Error ? requestError.message : "Unable to save the comment");
              });
          }}
        >
          <label className="block text-sm font-medium text-slate-700">
            Comment
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              value={comment}
            />
          </label>
          {commentError ? <p className="text-sm text-red-700">{commentError}</p> : null}
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800" disabled={isSaving || !comment.trim()} type="submit">
            Add comment
          </button>
        </form>
        <ul className="space-y-2">
          {(comments ?? []).map((update) => (
            <li className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-800" key={update.id}>
              {update.updateNotes}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function personName(person?: { email?: string; firstName?: string; lastName?: string } | null) {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return name || person?.email || "Unassigned";
}
