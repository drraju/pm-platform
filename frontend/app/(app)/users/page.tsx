"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  createRole,
  createUser,
  getRoles,
  getUsers,
  type ApiRole,
  type ApiUser,
} from "@/features/users";

export default function UsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [userData, roleData] = await Promise.all([getUsers(), getRoles()]);
      setUsers(userData);
      setRoles(roleData);
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create user");
    } finally {
      setIsSaving(false);
    }
  }

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
    </div>
  );
}
