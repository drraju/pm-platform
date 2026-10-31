"use client";

import React from "react";
import type { ApiTask } from "@/features/projects";
import { outlinePlan } from "@/features/work/plan-outline";
import { isWorkContainer, storedWorkStatus } from "@/features/work/work-count";
import { buildTimeline, getBarGeometry } from "@/components/planning/timeline-geometry";

export type PlanTimelineDependency = {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
};

type PlanTimelineProps = {
  dependencies: PlanTimelineDependency[];
  tasks: ApiTask[];
  today: string;
};

const rowHeight = 40;
const labelWidth = 220;

function taskDates(task: ApiTask, tasks: readonly ApiTask[]): { finish: string | null; start: string | null } {
  const ownStart = task.plannedStartDate || task.startDate || null;
  const ownFinish = task.plannedEndDate || task.dueDate || null;
  if (ownStart || ownFinish) {
    const finish = ownFinish || ownStart;
    const start = ownStart || ownFinish;
    if (!start || !finish) return { finish: null, start: null };
    return finish < start ? { finish: start, start } : { finish, start };
  }
  if (!isWorkContainer(task, tasks)) return { finish: null, start: null };
  const children = tasks.filter((item) => item.parentTaskId === task.id);
  const dated = children.map((child) => taskDates(child, tasks)).filter((item) => item.start && item.finish);
  if (dated.length === 0) return { finish: null, start: null };
  const starts = dated.map((item) => item.start).filter((value): value is string => Boolean(value)).sort();
  const finishes = dated.map((item) => item.finish).filter((value): value is string => Boolean(value)).sort();
  return { finish: finishes.at(-1) ?? null, start: starts[0] ?? null };
}

function barFill(task: ApiTask, tasks: readonly ApiTask[]) {
  if (isWorkContainer(task, tasks)) return "#e2e8f0";
  const status = storedWorkStatus(task.status);
  if (status === "done") return "#059669";
  if (status === "in_progress") return "#0284c7";
  if (status === "blocked") return "#fbbf24";
  return "#cbd5e1";
}

export function PlanTimeline({ dependencies, tasks, today }: PlanTimelineProps) {
  const rows = outlinePlan(tasks);
  const dated = rows.map(({ task }) => {
    const dates = taskDates(task, tasks);
    return {
      finishDate: dates.finish,
      startDate: dates.start,
      taskKind: task.taskKind === "milestone" ? "milestone" as const : task.taskKind === "summary" ? "summary" as const : "standard" as const,
    };
  });
  const timeline = buildTimeline(dated, "week", 640, today);
  const bars = new Map(
    rows.map(({ task }, index) => {
      const dates = taskDates(task, tasks);
      const geometry = dates.start && dates.finish
        ? getBarGeometry(
            {
              finishDate: dates.finish,
              startDate: dates.start,
              taskKind: task.taskKind === "milestone" ? "milestone" : "standard",
            },
            timeline,
          )
        : null;
      return [task.id, geometry ? { ...geometry, index } : null] as const;
    }),
  );
  const drawable = dependencies.filter((dependency) => bars.get(dependency.predecessorTaskId) && bars.get(dependency.successorTaskId));
  const waiting = dependencies.length - drawable.length;
  const height = Math.max(rowHeight, rows.length * rowHeight);

  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-slate-500">This project has no work items yet.</p>;
  }

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex min-w-0">
        <div className="shrink-0 border-r border-slate-200" style={{ width: labelWidth }}>
          {rows.map(({ depth, task }) => {
            const names = dependencies
              .filter((dependency) => dependency.successorTaskId === task.id)
              .map((dependency) => tasks.find((item) => item.id === dependency.predecessorTaskId)?.title)
              .filter((title): title is string => Boolean(title));
            return (
              <div className="flex h-10 flex-col justify-center px-3" key={task.id} style={{ paddingLeft: 12 + depth * 12 }}>
                <p className="truncate text-sm font-medium text-slate-950">{task.title}</p>
                {names.length > 0 ? (
                  <p className="truncate text-[11px] text-sky-800" title={names.join(", ")}>
                    <span className="sr-only">Dependencies for {task.title}: </span>
                    {names.join(" · ")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        <svg
          aria-label="Project timeline"
          className="h-auto min-w-0 flex-1"
          role="img"
          viewBox={`0 0 ${timeline.width} ${height}`}
        >
          {timeline.todayX != null ? (
            <line stroke="#94a3b8" strokeDasharray="3 3" x1={timeline.todayX} x2={timeline.todayX} y1={0} y2={height} />
          ) : null}
          {drawable.map((dependency) => {
            const predecessor = bars.get(dependency.predecessorTaskId);
            const successor = bars.get(dependency.successorTaskId);
            if (!predecessor || !successor) return null;
            const sourceX = predecessor.x + predecessor.width;
            const targetX = successor.x;
            const sourceY = predecessor.index * rowHeight + rowHeight / 2;
            const targetY = successor.index * rowHeight + rowHeight / 2;
            const midX = sourceX + (targetX - sourceX) / 2;
            return (
              <path
                d={`M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`}
                data-dependency-id={dependency.id}
                fill="none"
                key={dependency.id}
                stroke="#0369a1"
                strokeWidth={1.5}
              />
            );
          })}
          {rows.map(({ task }) => {
            const bar = bars.get(task.id);
            if (!bar) return null;
            const dates = taskDates(task, tasks);
            const overdue = !isWorkContainer(task, tasks) && task.status !== "done" && Boolean(dates.finish && dates.finish < today);
            return (
              <rect
                data-task-id={task.id}
                fill={barFill(task, tasks)}
                height={16}
                key={task.id}
                rx={4}
                stroke={overdue ? "#e11d48" : "transparent"}
                strokeWidth={overdue ? 2 : 0}
                width={bar.width}
                x={bar.x}
                y={bar.index * rowHeight + 12}
              />
            );
          })}
        </svg>
      </div>
      {waiting > 0 ? (
        <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
          {waiting} of {dependencies.length} links need a date on both tasks before they can be drawn.
        </p>
      ) : null}
    </section>
  );
}
