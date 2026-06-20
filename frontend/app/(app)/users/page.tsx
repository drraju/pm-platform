"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  createRole,
  createUser,
  getPermissions,
  getRoles,
  getUsers,
  updateRolePermissions,
  type ApiPermission,
  type ApiRole,
  type ApiUser,
} from "@/features/users";

export default function UsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);
  const [rolePermissionDrafts, setRolePermissionDrafts] = useState<
    Record<string, string[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [userData, roleData, permissionData] = await Promise.all([
        getUsers(),
        getRoles(),
        getPermissions(),
      ]);
      setUsers(userData);
      setRoles(roleData);
      setPermissions(permissionData);
      setRolePermissionDrafts(
        Object.fromEntries(
          roleData.map((role) => [
            role.id,
            (role.permissions ?? []).map((permission) => permission.key),
          ]),
        ),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load users");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await createRole({
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
      });
      form.reset();
      await loadData();
      setToast("Role created.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create role");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await createUser({
        email: String(formData.get("email") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        password: String(formData.get("password") ?? ""),
        roleId: String(formData.get("roleId") ?? ""),
        status: String(formData.get("status") ?? "active"),
      });
      form.reset();
      await loadData();
      setToast("User created.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create user");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleRolePermission(roleId: string, permissionKey: string) {
    setRolePermissionDrafts((currentDrafts) => {
      const currentPermissions = currentDrafts[roleId] ?? [];
      const nextPermissions = currentPermissions.includes(permissionKey)
        ? currentPermissions.filter((key) => key !== permissionKey)
        : [...currentPermissions, permissionKey];

      return {
        ...currentDrafts,
        [roleId]: nextPermissions,
      };
    });
  }

  async function handleSavePermissionMatrix() {
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all(
        roles.map((role) =>
          updateRolePermissions(role.id, rolePermissionDrafts[role.id] ?? []),
        ),
      );
      await loadData();
      setToast("Permission matrix saved.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save permission matrix",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const orderedRoles = orderRolesForMatrix(roles);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Review active workspace users, create roles, and assign role membership."
        eyebrow="Access management"
        title="Users"
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}
      {toast ? (
        <section className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {toast}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form className="rounded-md border border-slate-200 bg-white p-5 shadow-soft" onSubmit={handleCreateUser}>
          <h2 className="text-lg font-semibold text-slate-950">Add user</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              ["firstName", "First name", "text"],
              ["lastName", "Last name", "text"],
              ["email", "Email", "email"],
              ["password", "Password", "password"],
            ].map(([name, label, type]) => (
              <label className="block" key={name}>
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  minLength={name === "password" ? 8 : undefined}
                  name={name}
                  required
                  type={type}
                />
              </label>
            ))}

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="roleId"
                required
              >
                <option value="">Choose role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                name="status"
              >
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
          </div>
          <button
            className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-70"
            disabled={isSaving || roles.length === 0}
            type="submit"
          >
            Create user
          </button>
        </form>

        <form className="rounded-md border border-slate-200 bg-white p-5 shadow-soft" onSubmit={handleCreateRole}>
          <h2 className="text-lg font-semibold text-slate-950">Add role</h2>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Role name</span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              name="name"
              required
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              name="description"
            />
          </label>
          <button
            className="mt-5 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-70"
            disabled={isSaving}
            type="submit"
          >
            Create role
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="hidden grid-cols-[1fr_1.2fr_0.8fr_0.7fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? <p className="px-4 py-6 text-sm text-slate-500">Loading users...</p> : null}
          {!isLoading && users.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No users have been created yet.</p>
          ) : null}
          {users.map((user) => (
            <article
              className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[1fr_1.2fr_0.8fr_0.7fr] md:items-center"
              key={user.id}
            >
              <h2 className="font-semibold text-slate-950">
                {user.firstName} {user.lastName}
              </h2>
              <span className="text-slate-600">{user.email}</span>
              <span className="text-slate-600">{user.role?.name ?? "Unassigned"}</span>
              <span className="capitalize text-slate-700">{user.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Permission Matrix
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Align role capabilities used by the API and frontend navigation.
            </p>
          </div>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving || isLoading}
            onClick={handleSavePermissionMatrix}
            type="button"
          >
            {isSaving ? "Saving..." : "Save matrix"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-3">
                  Permission
                </th>
                {orderedRoles.map((role) => (
                  <th className="px-3 py-3 text-center" key={role.id}>
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissions.map((permission) => (
                <tr key={permission.key}>
                  <td className="sticky left-0 z-10 bg-white px-3 py-3">
                    <p className="font-semibold text-slate-950">
                      {permission.key}
                    </p>
                    {permission.description ? (
                      <p className="mt-1 max-w-xs text-xs text-slate-500">
                        {permission.description}
                      </p>
                    ) : null}
                  </td>
                  {orderedRoles.map((role) => {
                    const checked = (
                      rolePermissionDrafts[role.id] ?? []
                    ).includes(permission.key);

                    return (
                      <td className="px-3 py-3 text-center" key={role.id}>
                        <input
                          aria-label={`${role.name} ${permission.key}`}
                          checked={checked}
                          className="size-4 rounded border-slate-300 text-brand focus:ring-brand"
                          disabled={isSaving}
                          onChange={() =>
                            toggleRolePermission(role.id, permission.key)
                          }
                          type="checkbox"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!isLoading && permissions.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-6 text-sm text-slate-500"
                    colSpan={orderedRoles.length + 1}
                  >
                    No permissions have been configured.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const roleMatrixOrder = [
  "SUPER_ADMIN",
  "Admin",
  "Program Manager",
  "Project Manager",
  "Delivery Lead",
  "Team Member",
  "Engineer",
  "QA Engineer",
  "Executive",
  "Customer",
  "Partner",
];

function orderRolesForMatrix(roles: ApiRole[]) {
  return [...roles].sort((left, right) => {
    const leftIndex = roleMatrixOrder.indexOf(left.name);
    const rightIndex = roleMatrixOrder.indexOf(right.name);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.name.localeCompare(right.name);
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}
