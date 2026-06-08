"use client";

import { useEffect, useState } from "react";
import {
  AdminError,
  AdminPageShell,
  AdminPanel,
  EmptyAdminState,
} from "@/features/admin";
import {
  getAdminProjectMemberships,
  getAdminUsers,
  getProjects,
  type ApiProjectMember,
  type ApiProject,
  type ApiUser,
  upsertAdminProjectMembership,
} from "@/lib/api/client";

export default function AdminProjectsPage() {
  const [memberships, setMemberships] = useState<ApiProjectMember[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminProjectMemberships(), getProjects(), getAdminUsers()])
      .then(([nextMemberships, nextProjects, nextUsers]) => {
        setMemberships(nextMemberships);
        setProjects(nextProjects);
        setUsers(nextUsers);
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load memberships",
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AdminPageShell
      description="Assign users to projects, set project roles, and configure internal, partner, or customer visibility."
      title="Project Membership Administration"
    >
      {error ? <AdminError message={error} /> : null}
      <AdminPanel title="Assign Membership">
        <form
          className="grid gap-3 md:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void upsertAdminProjectMembership({
              projectId: String(form.get("projectId")),
              role: String(form.get("role")),
              userId: String(form.get("userId")),
              visibilityLevel: form.get("visibilityLevel") as
                | "INTERNAL"
                | "PARTNER"
                | "CUSTOMER",
            }).then(() => getAdminProjectMemberships().then(setMemberships));
          }}
        >
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="projectId"
            required
          >
            <option value="">Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="userId"
            required
          >
            <option value="">User</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="role"
            required
          >
            <option value="contributor">Contributor</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="viewer">Viewer</option>
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="visibilityLevel"
            required
          >
            <option value="INTERNAL">Internal</option>
            <option value="PARTNER">Partner</option>
            <option value="CUSTOMER">Customer</option>
          </select>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
            type="submit"
          >
            Save
          </button>
        </form>
      </AdminPanel>
      <AdminPanel title="Project Memberships">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading memberships...</p>
        ) : null}
        {!isLoading && memberships.length === 0 ? (
          <EmptyAdminState message="No project memberships found." />
        ) : null}
        {memberships.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2">Project</th>
                  <th>User</th>
                  <th>Project Role</th>
                  <th>Visibility</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => (
                  <tr className="border-b border-slate-100" key={membership.id}>
                    <td className="py-3">
                      {membership.project?.name ?? membership.projectId}
                    </td>
                    <td>{membership.user?.email ?? membership.userId}</td>
                    <td>{membership.role}</td>
                    <td>{membership.visibilityLevel ?? "INTERNAL"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminPanel>
    </AdminPageShell>
  );
}
