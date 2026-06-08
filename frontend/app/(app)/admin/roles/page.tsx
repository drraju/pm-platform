"use client";

import { useEffect, useState } from "react";
import {
  AdminError,
  AdminPageShell,
  AdminPanel,
  EmptyAdminState,
} from "@/features/admin";
import {
  cloneAdminRole,
  createAdminRole,
  getAdminRoles,
  updateAdminRole,
  type ApiRole,
} from "@/lib/api/client";

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadRoles() {
    setError(null);
    setIsLoading(true);
    try {
      setRoles(await getAdminRoles());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load roles",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRoles();
  }, []);

  return (
    <AdminPageShell
      description="Create, edit, disable, and clone platform roles."
      title="Role Management"
    >
      {error ? <AdminError message={error} /> : null}
      <AdminPanel title="Create Role">
        <form
          className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void createAdminRole({
              description: String(form.get("description") ?? ""),
              name: String(form.get("name")),
            }).then(loadRoles);
            event.currentTarget.reset();
          }}
        >
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="name"
            placeholder="Role name"
            required
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="description"
            placeholder="Description"
          />
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
            type="submit"
          >
            Create
          </button>
        </form>
      </AdminPanel>
      <AdminPanel title="Roles">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading roles...</p>
        ) : null}
        {!isLoading && roles.length === 0 ? (
          <EmptyAdminState message="No roles found." />
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {roles.map((role) => (
            <div
              className="rounded-md border border-slate-200 p-4"
              key={role.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{role.name}</h3>
                  <p className="text-sm text-slate-500">
                    {role.description ?? "No description"}
                  </p>
                  <p className="mt-1 text-xs uppercase text-slate-400">
                    {role.status ?? "active"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-sm font-semibold text-brand"
                    onClick={() => void cloneAdminRole(role.id).then(loadRoles)}
                    type="button"
                  >
                    Clone
                  </button>
                  <button
                    className="text-sm font-semibold text-brand"
                    onClick={() =>
                      void updateAdminRole(role.id, {
                        status: "disabled",
                      }).then(loadRoles)
                    }
                    type="button"
                  >
                    Disable
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
}
