"use client";

import React, { useState } from "react";
import type { ApiTask } from "@/features/projects";
import {
  countWork,
  isOverdueWork,
  isWorkContainer,
  storedWorkStatus,
  workStatusOptions,
} from "@/features/work/work-count";

type BoardMove = {
  nextStep?: string | null;
  status: ApiTask["status"];
};

const columns = workStatusOptions;

export function ProjectBoard({
  canMove,
  isSaving,
  onMove,
  onOpen,
  tasks,
  today,
}: {
  canMove: (task: ApiTask) => boolean;
  isSaving: boolean;
  onMove: (task: ApiTask, move: BoardMove) => Promise<void>;
  onOpen?: (task: ApiTask) => void;
  tasks: ApiTask[];
  today: string;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ status: ApiTask["status"]; taskId: string } | null>(null);
  const cards = tasks.filter((task) => !isWorkContainer(task, tasks));
  const containers = tasks.length - cards.length;
  const work = countWork(tasks, today);
  const containerWord = containers === 1 ? "container" : "containers";

  function requestMove(task: ApiTask, status: ApiTask["status"]) {
    if (storedWorkStatus(task.status) === status) return;
    if (status === "blocked") {
      setPending({ status, taskId: task.id });
      return;
    }
    setPending(null);
    void onMove(task, { status });
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {columns.map((column) => {
          const columnCards = cards.filter((task) => storedWorkStatus(task.status) === column.value);
          return (
            <div
              aria-label={`${column.label} column`}
              className="min-w-0 rounded-lg border border-slate-200 bg-slate-50"
              key={column.value}
              onDragOver={(event) => {
                if (draggedId) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/plain") || draggedId;
                const task = cards.find((item) => item.id === taskId);
                setDraggedId(null);
                if (!task || !canMove(task)) return;
                requestMove(task, column.value);
              }}
              role="region"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <h2 className={`text-sm font-semibold ${column.value === "blocked" ? "text-amber-800" : "text-slate-800"}`}>
                  {column.label}
                </h2>
                <span className="text-xs tabular-nums text-slate-500">{columnCards.length}</span>
              </div>
              <div className="space-y-2 p-2">
                {pending && column.value === "blocked" && cards.some((task) => task.id === pending.taskId) ? (
                  <BlockedStep
                    isSaving={isSaving}
                    onCancel={() => setPending(null)}
                    onConfirm={(nextStep) => {
                      const task = cards.find((item) => item.id === pending.taskId);
                      setPending(null);
                      if (task) void onMove(task, { nextStep, status: "blocked" });
                    }}
                    task={cards.find((item) => item.id === pending.taskId)!}
                  />
                ) : null}
                {columnCards.length === 0 && !(pending && column.value === "blocked") ? (
                  <p className="px-1 py-4 text-xs text-slate-500">Nothing in {column.label}.</p>
                ) : null}
                {columnCards.map((task) => (
                  <BoardCard
                    canMove={canMove(task)}
                    isSaving={isSaving}
                    key={task.id}
                    onDragStart={() => setDraggedId(task.id)}
                    onMove={(status) => requestMove(task, status)}
                    onOpen={onOpen}
                    overdue={isOverdueWork(task, tasks, today)}
                    task={task}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        {work.line} · {containers} {containerWord} excluded
      </p>
    </section>
  );
}

function BoardCard({
  canMove,
  isSaving,
  onDragStart,
  onMove,
  onOpen,
  overdue,
  task,
}: {
  canMove: boolean;
  isSaving: boolean;
  onDragStart: () => void;
  onMove: (status: ApiTask["status"]) => void;
  onOpen?: (task: ApiTask) => void;
  overdue: boolean;
  task: ApiTask;
}) {
  const [open, setOpen] = useState(false);
  const owner = personName(task.assignee);

  return (
    <article
      className="rounded-md border border-slate-200 bg-white p-2 shadow-sm"
      draggable={canMove && !isSaving}
      onDragStart={(event) => {
        if (!canMove) return;
        event.dataTransfer.setData("text/plain", task.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
    >
      {onOpen ? (
        <button className="text-left text-sm font-medium text-slate-900" onClick={() => onOpen(task)} type="button">
          {task.title}
        </button>
      ) : (
        <h3 className="text-sm font-medium text-slate-900">{task.title}</h3>
      )}
      <p className="mt-1 truncate text-xs text-slate-600">{owner}</p>
      <p className={`mt-1 text-xs ${overdue ? "font-medium text-red-700" : "text-slate-500"}`}>
        {formatPlanDate(task.dueDate) || "No finish"}
        {overdue ? <span className="ml-1 uppercase tracking-wide">Overdue</span> : null}
      </p>
      {canMove ? (
        <div className="relative mt-2">
          <button
            aria-expanded={open}
            aria-label={`Move ${task.title}`}
            className="text-xs font-semibold text-teal-800"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            Move
          </button>
          {open ? (
            <ul className="absolute left-0 z-10 mt-1 w-36 rounded-md border border-slate-200 bg-white py-1 shadow-lg" role="listbox">
              {columns.map((column) => (
                <li key={column.value}>
                  <button
                    aria-selected={storedWorkStatus(task.status) === column.value}
                    className="block w-full px-2 py-1 text-left text-xs hover:bg-slate-50"
                    onClick={() => {
                      setOpen(false);
                      onMove(column.value);
                    }}
                    role="option"
                    type="button"
                  >
                    {column.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function BlockedStep({
  isSaving,
  onCancel,
  onConfirm,
  task,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: (nextStep: string) => void;
  task: ApiTask;
}) {
  const [nextStep, setNextStep] = useState(task.nextStep ?? "");

  return (
    <form
      className="rounded-md border border-amber-200 bg-amber-50 p-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!nextStep.trim()) return;
        onConfirm(nextStep.trim());
      }}
    >
      <p className="text-xs font-medium text-amber-900">Next step for {task.title}</p>
      <input
        aria-label={`Next step for ${task.title}`}
        className="mt-1 w-full rounded border border-amber-300 bg-white px-2 py-1 text-xs"
        onChange={(event) => setNextStep(event.target.value)}
        value={nextStep}
      />
      <div className="mt-2 flex gap-2">
        <button className="text-xs font-semibold text-amber-900 disabled:opacity-40" disabled={isSaving || !nextStep.trim()} type="submit">
          Move to Blocked
        </button>
        <button className="text-xs text-slate-600" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}

function formatPlanDate(value?: string | null) {
  const shown = value?.slice(0, 10) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shown)) return "";
  const [year, month, day] = shown.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function personName(person?: { email?: string; firstName?: string; lastName?: string } | null) {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return name || person?.email || "Unassigned";
}
