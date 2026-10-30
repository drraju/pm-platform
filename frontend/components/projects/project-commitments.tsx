"use client";

import React from "react";
import type { ApiCommitment } from "@/features/customers";

export function ProjectCommitments({
  canAccept,
  commitments,
  isSaving,
  onAccept,
}: {
  canAccept: boolean;
  commitments: ApiCommitment[];
  isSaving: boolean;
  onAccept: (commitment: ApiCommitment) => Promise<void>;
}) {
  const visible = commitments.filter((commitment) => commitment.status !== "dismissed");
  if (visible.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Commitments</h2>
      <ul className="mt-3 divide-y divide-slate-100">
        {visible.map((commitment) => (
          <li className="flex items-center justify-between gap-3 py-2 text-sm" key={commitment.id}>
            <div>
              <p className="font-medium text-slate-900">{commitment.title}</p>
              <p className="text-xs text-slate-500">{commitment.dueDate?.slice(0, 10) || "No due date"}</p>
            </div>
            {commitment.status === "accepted" ? (
              <span className="text-xs text-slate-500">On the plan</span>
            ) : canAccept ? (
              <button
                className="text-sm font-semibold text-teal-800 disabled:opacity-40"
                disabled={isSaving}
                onClick={() => void onAccept(commitment)}
                type="button"
              >
                Accept {commitment.title}
              </button>
            ) : (
              <span className="text-xs text-slate-500">Open</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
