import React from "react";
import type { ApiProjectHealthStatus } from "@/lib/api/client";

type ProjectHealthBadgeProps = {
  status: ApiProjectHealthStatus;
};

const healthStyles: Record<ApiProjectHealthStatus, string> = {
  AMBER: "border-amber-200 bg-amber-50 text-amber-800",
  GREEN: "border-emerald-200 bg-emerald-50 text-emerald-800",
  RED: "border-red-200 bg-red-50 text-red-700",
};

export function ProjectHealthBadge({ status }: ProjectHealthBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${healthStyles[status]}`}
    >
      {formatHealthStatus(status)}
    </span>
  );
}

export function ProjectHealthFactors({ factors }: { factors?: string[] }) {
  if (!factors || factors.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2 space-y-1 text-xs text-slate-500">
      {factors.map((factor) => (
        <li key={factor}>{factor}</li>
      ))}
    </ul>
  );
}

function formatHealthStatus(status: ApiProjectHealthStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
