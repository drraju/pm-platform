"use client";

import React from "react";
import Link from "next/link";
import type { ApiProjectDetails } from "@/features/projects";
import { countWork, todayDate } from "@/features/work/work-count";

const statusLabels: Record<string, string> = {
  active: "Active",
  done: "Done",
  paused: "Paused",
  planned: "Planned",
};

export function ProjectRecord({
  commitments,
  project,
  slack,
}: {
  commitments?: React.ReactNode;
  project: ApiProjectDetails;
  slack?: React.ReactNode;
}) {
  const lead = project.members?.find((member) => member.role === "owner" || member.role === "manager");
  const leadUser = lead?.user ?? project.owner;
  const leadName = [leadUser?.firstName, leadUser?.lastName].filter(Boolean).join(" ").trim() || leadUser?.email || "Unassigned";
  const work = countWork(project.tasks ?? [], todayDate());

  return (
    <section className="max-w-3xl space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Customer" value={project.customer?.name ?? "No customer"} />
        <Detail label="Lead" value={leadName} />
        <Detail label="Status" value={statusLabels[project.status] ?? project.status} />
        <Detail label="Target finish" value={project.targetEndDate?.slice(0, 10) || "—"} />
        <Detail label="Health" value={work.line} />
      </dl>
      {commitments}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Summary</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
          {project.description?.trim() ? project.description : "No summary yet."}
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Team</h2>
          <Link className="text-sm font-medium text-brand hover:text-teal-800" href={`/projects/${project.id}/team`}>
            Open team
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-slate-100">
          {(project.members ?? []).map((member) => {
            const name = [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ").trim() || member.user?.email || "Person";
            return (
              <li className="flex items-center justify-between py-2 text-sm" key={member.id}>
                <span className="text-slate-900">{name}</span>
                <span className="text-slate-500">{membershipLabel(member.role)}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {slack}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function membershipLabel(role: string) {
  if (role === "owner" || role === "manager") return "Lead";
  if (role === "viewer") return "Viewer";
  return "Contributor";
}
