import React from "react";
import { ProjectHealthBadge } from "@/components/projects/project-health-badge";
import type { ApiProjectHealth } from "@/lib/api/client";

type ProjectHealthCardProps = {
  health: ApiProjectHealth;
};

export function ProjectHealthCard({ health }: ProjectHealthCardProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Health Status
          </h2>
          <div className="mt-3">
            <ProjectHealthBadge reasons={health.reasons} status={health.status} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-700">Reasons</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {health.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
