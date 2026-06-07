import React from "react";
import type { ApiProjectHealthStatus } from "@/lib/api/client";

type ProjectHealthBadgeProps = {
  reasons?: string[];
  status: ApiProjectHealthStatus;
};

const healthStyles: Record<ApiProjectHealthStatus, string> = {
  AMBER: "border-amber-200 bg-amber-50 text-amber-800",
  GREEN: "border-emerald-200 bg-emerald-50 text-emerald-800",
  RED: "border-red-200 bg-red-50 text-red-700",
};

const healthIcons: Record<ApiProjectHealthStatus, string> = {
  AMBER: "🟡",
  GREEN: "🟢",
  RED: "🔴",
};

export function ProjectHealthBadge({ reasons, status }: ProjectHealthBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${healthStyles[status]}`}
      title={formatTooltip(reasons)}
    >
      <span aria-hidden="true" className="mr-1.5">
        {healthIcons[status]}
      </span>
      {formatHealthStatus(status)}
    </span>
  );
}

export function ProjectHealthReasons({ reasons }: { reasons?: string[] }) {
  if (!reasons || reasons.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2 space-y-1 text-xs text-slate-500">
      {reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  );
}

function formatHealthStatus(status: ApiProjectHealthStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatTooltip(reasons?: string[]) {
  return reasons && reasons.length > 0
    ? reasons.join("\n")
    : "No health issues identified";
}
