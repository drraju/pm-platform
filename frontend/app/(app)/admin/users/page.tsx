"use client";

import { useEffect, useState } from "react";
import {
  AdminError,
  AdminPageShell,
  AdminPanel,
  EmptyAdminState,
} from "@/features/admin";
import {
  createAdminUser,
  disableAdminUser,
  getAdminRoles,
  getAdminUsers,
  resetAdminUserPassword,
  type ApiRole,
  type ApiUser,
} from "@/lib/api/client";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);
    try {
      const [nextUsers, nextRoles] = await Promise.all([
        getAdminUsers(),
        getAdminRoles(),
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load users",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  return (
    <AdminPageShell
      description="Create, edit, disable, reset passwords, assign roles, and manage project memberships."
      title="User Management"
    >
      {error ? <AdminError message={error} /> : null}
      <AdminPanel title="Create User">
        <form
          className="grid gap-3 md:grid-cols-6"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void createAdminUser({
              email: String(form.get("email")),
              firstName: String(form.get("firstName")),
              lastName: String(form.get("lastName")),
              password: String(form.get("password")),
              roleId: String(form.get("roleId")),
            }).then(loadUsers);
            event.currentTarget.reset();
          }}
        >
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="firstName"
            placeholder="First name"
            required
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="lastName"
            placeholder="Last name"
            required
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="email"
            placeholder="Email"
            required
            type="email"
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="password"
            placeholder="Temporary password"
            required
            type="password"
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="roleId"
            required
          >
            <option value="">Role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
            type="submit"
          >
            Create
          </button>
        </form>
      </AdminPanel>
      <AdminPanel title="Users">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading users...</p>
        ) : null}
        {!isLoading && users.length === 0 ? (
          <EmptyAdminState message="No users found." />
        ) : null}
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr className="border-b border-slate-100" key={user.id}>
                    <td className="py-3">
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.role?.name ?? "Unassigned"}</td>
                    <td>{user.status}</td>
                    <td>Not tracked</td>
                    <td className="space-x-2">
                      <button
                        className="text-brand"
                        onClick={() =>
                          void disableAdminUser(user.id).then(loadUsers)
                        }
                        type="button"
                      >
                        Disable
                      </button>
                      <button
                        className="text-brand"
                        onClick={() =>
                          void resetAdminUserPassword(
                            user.id,
                            "Temp1234!",
                          ).then(loadUsers)
                        }
                        type="button"
                      >
                        Reset
                      </button>
                    </td>
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
