"use client";

import { useEffect, useState } from "react";
import {
  AdminError,
  AdminPageShell,
  AdminPanel,
  EmptyAdminState,
} from "@/features/admin";
import {
  createAdminPermission,
  getAdminPermissions,
  type ApiPermission,
} from "@/lib/api/client";

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadPermissions() {
    await getAdminPermissions()
      .then(setPermissions)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load permissions",
        ),
      )
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void loadPermissions();
  }, []);

  const grouped = permissions.reduce<Record<string, ApiPermission[]>>(
    (groups, permission) => {
      const category = permission.category || "Administration";
      groups[category] = [...(groups[category] ?? []), permission];
      return groups;
    },
    {},
  );

  return (
    <AdminPageShell
      description="View and categorize permissions used by dashboards, projects, RAID, users, roles, administration, and notifications."
      title="Permission Management"
    >
      {error ? <AdminError message={error} /> : null}
      <AdminPanel title="Create Permission">
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void createAdminPermission({
              category: String(form.get("category") ?? "Administration"),
              description: String(form.get("description") ?? ""),
              key: String(form.get("key")),
            }).then(loadPermissions);
            event.currentTarget.reset();
          }}
        >
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="key"
            placeholder="permission:key"
            required
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            name="category"
            placeholder="Category"
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
      <AdminPanel title="Permission Catalog">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading permissions...</p>
        ) : null}
        {!isLoading && permissions.length === 0 ? (
          <EmptyAdminState message="No permissions found." />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div
              className="rounded-md border border-slate-200 p-4"
              key={category}
            >
              <h3 className="font-semibold">{category}</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {items.map((permission) => (
                  <li key={permission.id}>{permission.key}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
}
