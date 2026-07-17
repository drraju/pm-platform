import React from "react";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import type { ApiProjectHealthStatus } from "@/lib/api/client";

type ProjectHealthBadgeProps = {
  reasons?: string[];
  status: ApiProjectHealthStatus;
};

const healthTones: Record<ApiProjectHealthStatus, StatusTone> = {
  AMBER: "warning",
  GREEN: "success",
  RED: "danger",
};

export function ProjectHealthBadge({ reasons, status }: ProjectHealthBadgeProps) {
  return (
    <StatusBadge
      dot
      title={formatTooltip(reasons)}
      tone={healthTones[status]}
    >
      {formatHealthStatus(status)}
    </StatusBadge>
  );
}

export function ProjectHealthReasons({ reasons }: { reasons?: string[] }) {
  if (!reasons || reasons.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2 space-y-1 text-sm leading-5 text-slate-600">
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
