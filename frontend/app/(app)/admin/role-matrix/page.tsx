"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminError, AdminPageShell, AdminPanel } from "@/features/admin";
import {
  getAdminRoleMatrix,
  updateAdminRoleMatrix,
  type ApiPermission,
  type ApiRole,
} from "@/lib/api/client";

export default function AdminRoleMatrixPage() {
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getAdminRoleMatrix()
      .then((matrix) => {
        setRoles(matrix.roles);
        setPermissions(matrix.permissions);
        setSelected(
          Object.fromEntries(
            matrix.roles.map((role) => [
              role.id,
              new Set(
                (role.permissions ?? []).map((permission) => permission.id),
              ),
            ]),
          ),
        );
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load matrix",
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const validationError = useMemo(
    () =>
      roles.length === 0 || permissions.length === 0
        ? "Roles and permissions are required before saving."
        : null,
    [permissions.length, roles.length],
  );

  function toggle(roleId: string, permissionId: string) {
    setSelected((current) => {
      const next = new Set(current[roleId] ?? []);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return { ...current, [roleId]: next };
    });
  }

  async function save() {
    if (validationError) return;
    setIsSaving(true);
    setError(null);
    try {
      const matrix = await updateAdminRoleMatrix({
        assignments: roles.map((role) => ({
          roleId: role.id,
          permissionIds: [...(selected[role.id] ?? [])],
        })),
      });
      setRoles(matrix.roles);
      setPermissions(matrix.permissions);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save matrix",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminPageShell
      description="Configure role-permission assignments with real-time validation. Inheritance can be represented by cloning roles and assigning additive permissions."
      title="Role-Permission Matrix"
    >
      {error ? <AdminError message={error} /> : null}
      <AdminPanel title="Matrix">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading matrix...</p>
        ) : null}
        {validationError && !isLoading ? (
          <p className="mb-3 text-sm text-amber-700">{validationError}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2">Permission</th>
                {roles.map((role) => (
                  <th key={role.id}>{role.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr className="border-b border-slate-100" key={permission.id}>
                  <td className="py-2">{permission.key}</td>
                  {roles.map((role) => (
                    <td key={role.id}>
                      <input
                        checked={selected[role.id]?.has(permission.id) ?? false}
                        onChange={() => toggle(role.id, permission.id)}
                        type="checkbox"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          disabled={Boolean(validationError) || isSaving}
          onClick={save}
          type="button"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </AdminPanel>
    </AdminPageShell>
  );
}
