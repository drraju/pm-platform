import React from "react";
import type { ApiProjectMember } from "@/features/projects";

type ProjectWorkspaceTeamProps = {
  members: ApiProjectMember[];
};

export function ProjectWorkspaceTeam({ members }: ProjectWorkspaceTeamProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Team Members
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Project roles for assigned team members.
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {members.length}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="hidden grid-cols-[1fr_1.2fr_0.8fr] border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <span>Name</span>
          <span>Email</span>
          <span>Project Role</span>
        </div>
        {members.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">No members yet.</p>
        ) : null}
        {members.map((member) => (
          <article
            className="grid gap-3 border-b border-slate-100 px-3 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_1.2fr_0.8fr] md:items-center"
            key={member.id}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">
                Name
              </p>
              <h3 className="font-semibold text-slate-950">
                {member.user
                  ? `${member.user.firstName} ${member.user.lastName}`
                  : "Unknown user"}
              </h3>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">
                Email
              </p>
              <p className="text-slate-600">
                {member.user?.email ?? "No email"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:hidden">
                Project Role
              </p>
              <span className="capitalize text-slate-600">
                {formatLabel(member.role)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}
