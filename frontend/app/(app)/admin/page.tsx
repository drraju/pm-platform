"use client";

import { useEffect, useState } from "react";
import {
  AdminError,
  AdminPageShell,
  AdminPanel,
  EmptyAdminState,
} from "@/features/admin";
import { getAdminDashboard } from "@/lib/api/client";

type AdminDashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then(setDashboard)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load administration",
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AdminPageShell
      description="Manage users, roles, permissions, role assignments, project memberships, and audit readiness."
      title="Administration Console"
    >
      {isLoading ? <AdminPanel title="Loading">Loading...</AdminPanel> : null}
      {error ? <AdminError message={error} /> : null}
      {dashboard ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(dashboard.totals).map(([label, value]) => (
            <AdminPanel key={label} title={label}>
              <p className="text-3xl font-semibold text-slate-950">{value}</p>
            </AdminPanel>
          ))}
        </div>
      ) : null}
      {dashboard ? (
        <AdminPanel title="Audit Logs">
          <EmptyAdminState message="Audit log storage is not yet connected. Administrative actions are routed through protected APIs ready for audit integration." />
        </AdminPanel>
      ) : null}
    </AdminPageShell>
  );
}
