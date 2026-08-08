"use client";

import React, { useMemo, useState } from "react";
import {
  EmptyState,
  LoadingState,
  WorkspaceSection,
} from "@/components/foundation";
import type {
  ApiProjectMember,
  ApiTask,
  ApiTaskExecutionUpdate,
} from "@/features/projects";

type DeliveryHistoryProps = {
  members: ApiProjectMember[];
  onLoadHistory: (taskId: string) => Promise<ApiTaskExecutionUpdate[]>;
  tasks: ApiTask[];
};

/**
 * Project-level execution audit surface.
 * Uses existing task execution updates — no new APIs.
 */
export function DeliveryHistory({
  members,
  onLoadHistory,
  tasks,
}: DeliveryHistoryProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [history, setHistory] = useState<ApiTaskExecutionUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentUpdates = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          task.taskKind !== "summary" && Boolean(task.latestExecutionUpdate),
      )
      .map((task) => ({
        task,
        update: task.latestExecutionUpdate!,
      }))
      .sort((left, right) => {
        const leftDate = left.update.updatedOn ?? "";
        const rightDate = right.update.updatedOn ?? "";
        return rightDate.localeCompare(leftDate);
      });
  }, [tasks]);

  async function handleSelectTask(task: ApiTask) {
    setSelectedTaskId(task.id);
    setIsLoading(true);
    setError(null);
    try {
      setHistory(await onLoadHistory(task.id));
    } catch (requestError) {
      setHistory([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load execution history",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (recentUpdates.length === 0) {
    return (
      <EmptyState
        description="Execution updates will appear here after stand-up activity."
        title="No execution history yet"
      />
    );
  }

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <WorkspaceSection surface="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-950">
          Recent updates
        </h2>
        <ul aria-label="Recent execution updates" className="space-y-2">
          {recentUpdates.map(({ task, update }) => {
            const isSelected = selectedTaskId === task.id;
            return (
              <li key={`${task.id}-${update.id}`}>
                <button
                  aria-pressed={isSelected}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-brand bg-sky-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => void handleSelectTask(task)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {task.title}
                    </p>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatDate(update.updatedOn)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-600">
                    {update.nextStep ?? "No next step recorded"}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </WorkspaceSection>

      <WorkspaceSection surface="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-950">
          {selectedTask
            ? `History · ${selectedTask.title}`
            : "Select a task"}
        </h2>
        {!selectedTask ? (
          <EmptyState
            compact
            description="Choose a recent update to inspect full execution history."
            title="No task selected"
          />
        ) : null}
        {selectedTask && isLoading ? (
          <LoadingState label="Loading history" rows={3} />
        ) : null}
        {selectedTask && error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : null}
        {selectedTask && !isLoading && !error && history.length === 0 ? (
          <EmptyState
            compact
            description="No execution updates recorded for this task."
            title="No history"
          />
        ) : null}
        {selectedTask && !isLoading ? (
          <ul className="space-y-3">
            {history.map((update) => (
              <li
                className="rounded-md border border-slate-200 p-3 text-sm"
                key={update.id}
              >
                <div className="flex justify-between gap-2 text-xs text-slate-500">
                  <span>{formatDate(update.updatedOn)}</span>
                  <span>
                    {formatMemberByUserId(update.updatedById, members)}
                  </span>
                </div>
                <p className="mt-2 font-medium text-slate-900">
                  {update.nextStep ?? "No next step recorded"}
                </p>
                {update.updateNotes ? (
                  <p className="mt-1 whitespace-pre-line text-slate-600">
                    {update.updateNotes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </WorkspaceSection>
    </div>
  );
}

function formatMemberByUserId(
  userId: string | null | undefined,
  members: ApiProjectMember[],
) {
  if (!userId) {
    return "Unknown";
  }
  const member = members.find((candidate) => candidate.userId === userId);
  const user = member?.user;
  if (!user) {
    return "Unknown";
  }
  return (
    user.displayName ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    "Unknown"
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Unknown date";
  }
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
