"use client";

import React, { useEffect, useState } from "react";
import type { ApiTask, ApiTaskExecutionUpdate } from "@/features/projects";
import { workStatusLabel } from "@/features/work/work-count";

type WorkMember = {
  role?: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
  userId: string;
};

type WorkPanelProps = {
  canAssign?: boolean;
  canComment: boolean;
  canEditTitle: boolean;
  isSaving: boolean;
  members?: WorkMember[];
  onClose: () => void;
  onComment: (taskId: string, body: string) => Promise<void>;
  onLoadComments: (taskId: string) => Promise<ApiTaskExecutionUpdate[]>;
  onUpdate: (task: ApiTask, patch: { assigneeId?: string | null; title?: string }) => Promise<void>;
  task: ApiTask;
};

function personName(person?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null) {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return name || person?.email || "Unassigned";
}

export function WorkPanel({
  canAssign = false,
  canComment,
  canEditTitle,
  isSaving,
  members = [],
  onClose,
  onComment,
  onLoadComments,
  onUpdate,
  task,
}: WorkPanelProps) {
  const [title, setTitle] = useState(task.title);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<ApiTaskExecutionUpdate[] | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const assignable = members.filter((member) => member.role !== "viewer");

  useEffect(() => {
    setTitle(task.title);
    setComment("");
    setCommentError(null);
  }, [task.id, task.title]);

  useEffect(() => {
    if (!canComment) {
      setComments([]);
      return;
    }
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
  }, [canComment, onLoadComments, task.id]);

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">Work</h2>
        <button className="text-sm font-medium text-slate-600" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <div className="space-y-4 overflow-y-auto px-4 py-4">
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            disabled={!canEditTitle || isSaving}
            onBlur={() => {
              if (title.trim() && title !== task.title) void onUpdate(task, { title });
            }}
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        {task.project?.name ? (
          <p className="text-sm text-slate-600">{task.project.name}</p>
        ) : null}
        {canAssign && assignable.length > 0 ? (
          <label className="block text-sm font-medium text-slate-700">
            Owner
            <select
              aria-label="Owner"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              disabled={isSaving}
              onChange={(event) =>
                void onUpdate(task, { assigneeId: event.target.value || null })
              }
              value={task.assigneeId ?? ""}
            >
              <option value="">Unassigned</option>
              {assignable.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {personName(member.user)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-slate-600">Owner: {personName(task.assignee)}</p>
        )}
        <p className="text-sm text-slate-600">
          Status stays {workStatusLabel(task.status)} until you change it on the row.
        </p>
        {canComment ? (
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
                  setCommentError(
                    requestError instanceof Error ? requestError.message : "Unable to save the comment",
                  );
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
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800"
              disabled={isSaving || !comment.trim()}
              type="submit"
            >
              Add comment
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-600">
            {task.taskKind === "summary" ? "A container does not take comments." : "Comments stay with the delivery team."}
          </p>
        )}
        {canComment ? (
          <ul className="space-y-2">
            {(comments ?? []).map((update) => (
              <li className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-800" key={update.id}>
                {update.updateNotes}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}
