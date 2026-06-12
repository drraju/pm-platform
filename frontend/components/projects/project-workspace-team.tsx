import React from "react";
import type { ApiAssignableUser, ApiProjectMember } from "@/lib/api/client";

type ProjectWorkspaceTeamProps = {
  availableUsers?: ApiAssignableUser[];
  isSaving?: boolean;
  onAddMember?: (input: { role: string; userId: string }) => void;
  onRemoveMember?: (memberId: string) => void;
  onUpdateMember?: (memberId: string, input: { role: string }) => void;
  members: ApiProjectMember[];
};

const projectRoles = [
  { label: "Owner", value: "owner" },
  { label: "Manager", value: "manager" },
  { label: "Contributor", value: "contributor" },
  { label: "Viewer", value: "viewer" },
];

export function ProjectWorkspaceTeam({
  availableUsers = [],
  isSaving = false,
  members,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
}: ProjectWorkspaceTeamProps) {
  const [userId, setUserId] = React.useState("");
  const [role, setRole] = React.useState("contributor");
  const memberUserIds = new Set(members.map((member) => member.userId));
  const usersToAdd = availableUsers.filter((user) => !memberUserIds.has(user.id));

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

      {onAddMember ? (
        <div className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_0.6fr_auto] md:items-end">
          <label className="block text-sm font-medium text-slate-700">
            Add member
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setUserId(event.target.value)}
              value={userId}
            >
              <option value="">Select user</option>
              {usersToAdd.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Role in project
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setRole(event.target.value)}
              value={role}
            >
              {projectRoles.map((projectRole) => (
                <option key={projectRole.value} value={projectRole.value}>
                  {projectRole.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!userId || isSaving}
            onClick={() => {
              onAddMember({ role, userId });
              setUserId("");
              setRole("contributor");
            }}
            type="button"
          >
            Add
          </button>
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <div className="hidden grid-cols-[1fr_1.2fr_0.8fr_auto] border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <span>Name</span>
          <span>Email</span>
          <span>Project Role</span>
          <span>Actions</span>
        </div>
        {members.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">No members yet.</p>
        ) : null}
        {members.map((member) => (
          <article
            className="grid gap-3 border-b border-slate-100 px-3 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_1.2fr_0.8fr_auto] md:items-center"
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
              {onUpdateMember ? (
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm capitalize outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  disabled={isSaving}
                  onChange={(event) =>
                    onUpdateMember(member.id, { role: event.target.value })
                  }
                  value={member.role}
                >
                  {projectRoles.map((projectRole) => (
                    <option key={projectRole.value} value={projectRole.value}>
                      {projectRole.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="capitalize text-slate-600">
                  {formatLabel(member.role)}
                </span>
              )}
            </div>
            <div>
              {onRemoveMember ? (
                <button
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSaving}
                  onClick={() => onRemoveMember(member.id)}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
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
