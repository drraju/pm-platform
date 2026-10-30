"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ApiCommitment, ApiCustomer, ApiCustomerProject } from "@/features/customers";
import { ownerName } from "@/features/customers";
import { countWork, todayDate } from "@/features/work/work-count";

export function CustomerSuccess({
  commitments,
  customer,
  isSaving,
  onCreate,
  onDismiss,
  onSave,
  projects,
}: {
  commitments: ApiCommitment[];
  customer: ApiCustomer;
  isSaving: boolean;
  onCreate: (input: { dueDate: string | null; projectId: string; title: string }) => Promise<void>;
  onDismiss: (commitment: ApiCommitment) => Promise<void>;
  onSave: (input: { lastTouch: string | null; renewalDate: string | null; successNote: string | null }) => Promise<void>;
  projects: ApiCustomerProject[];
}) {
  const [renewalDate, setRenewalDate] = useState(customer.renewalDate?.slice(0, 10) ?? "");
  const [lastTouch, setLastTouch] = useState(customer.lastTouch?.slice(0, 10) ?? "");
  const [successNote, setSuccessNote] = useState(customer.successNote ?? "");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const today = todayDate();

  return (
    <div className="max-w-3xl space-y-5">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Account</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Owner</dt>
            <dd className="mt-1 text-sm text-slate-900">{ownerName(customer.owner)}</dd>
          </div>
        </dl>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave({
              lastTouch: lastTouch || null,
              renewalDate: renewalDate || null,
              successNote,
            });
          }}
        >
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Renewal</span>
            <input className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" onChange={(event) => setRenewalDate(event.target.value)} type="date" value={renewalDate} />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Last touch</span>
            <input aria-label="Last touch" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5" onChange={(event) => setLastTouch(event.target.value)} type="date" value={lastTouch} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Success note</span>
            <textarea aria-label="Success note" className="mt-1 min-h-20 w-full rounded border border-slate-300 px-2 py-1.5" onChange={(event) => setSuccessNote(event.target.value)} value={successNote} />
          </label>
          <button className="w-fit rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isSaving} type="submit">
            Save success details
          </button>
        </form>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Projects</h2>
        {projects.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No projects are linked to this customer yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {projects.map((project) => (
              <li className="flex items-center justify-between gap-3 py-2 text-sm" key={project.id}>
                <Link className="font-semibold text-slate-950 hover:text-brand" href={`/projects/${project.id}`}>
                  {project.name}
                </Link>
                <span>{countWork(project.work ?? [], today).line}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Commitments</h2>
        {commitments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No commitments yet. Add one against a project. It stays off the plan until a lead accepts it.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {commitments.map((commitment) => (
              <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" key={commitment.id}>
                <div>
                  <p className="font-medium text-slate-900">{commitment.title}</p>
                  <p className="text-xs text-slate-500">
                    {commitment.projectName} · {commitment.dueDate?.slice(0, 10) || "No due date"} · {commitment.status === "accepted" ? "Accepted" : "Open"}
                  </p>
                </div>
                <button className="text-xs font-semibold text-slate-600" onClick={() => void onDismiss(commitment)} type="button">
                  Dismiss {commitment.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!title.trim() || !projectId) return;
            void onCreate({ dueDate: dueDate || null, projectId, title: title.trim() }).then(() => {
              setTitle("");
              setDueDate("");
            });
          }}
        >
          <input aria-label="Commitment title" className="rounded border border-slate-300 px-2 py-1.5 text-sm" onChange={(event) => setTitle(event.target.value)} placeholder="Commitment" value={title} />
          <input aria-label="Commitment due date" className="rounded border border-slate-300 px-2 py-1.5 text-sm" onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
          <select aria-label="Commitment project" className="rounded border border-slate-300 px-2 py-1.5 text-sm" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
            {projects.length === 0 ? <option value="">No project</option> : null}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <button className="rounded-md px-2 py-1.5 text-sm font-semibold text-teal-800 disabled:opacity-40" disabled={isSaving || !title.trim() || !projectId} type="submit">
            Add commitment
          </button>
        </form>
      </section>
    </div>
  );
}
