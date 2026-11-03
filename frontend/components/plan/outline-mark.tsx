import React from "react";
import {
  outlineRoleHint,
  outlineRoleLabel,
  type OutlineRole,
} from "@/features/work/outline-role";

export function OutlineMark({
  role,
  subtask = false,
}: {
  role: OutlineRole;
  subtask?: boolean;
}) {
  const label = outlineRoleLabel(role, subtask);
  const checkpoint = role === "gate" && !subtask;

  return (
    <svg
      aria-label={label}
      className={`size-3.5 shrink-0 ${checkpoint ? "text-slate-800" : "text-slate-500"}`}
      fill="none"
      role="img"
      title={outlineRoleHint(role, subtask)}
      viewBox="0 0 16 16"
    >
      {markShape(role, subtask)}
    </svg>
  );
}

function markShape(role: OutlineRole, subtask: boolean) {
  const stroke = {
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.6,
  };

  if (subtask) {
    return (
      <>
        <path d="M2.6 3.2v4.3h3.5" {...stroke} />
        <rect x="6.7" y="6.5" width="6.6" height="6.6" rx="1.4" {...stroke} />
      </>
    );
  }

  if (role === "phase") {
    return (
      <>
        <path d="M4 2.2v11.6" {...stroke} />
        <path d="M4 3.1h6.3L8.7 5.5 10.3 7.9H4" {...stroke} />
      </>
    );
  }

  if (role === "milestone") {
    return (
      <>
        <rect x="2.7" y="2.7" width="10.6" height="10.6" rx="1.5" {...stroke} />
        <path d="M2.7 6.4h10.6" {...stroke} />
      </>
    );
  }

  if (role === "summary") {
    return (
      <path
        d="M2.5 4.6h3.8l1.1 1.5h6.1a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1V5.4a.8.8 0 0 1 .1-.8Z"
        {...stroke}
      />
    );
  }

  if (role === "gate") {
    return <path d="M8 1.8 13.4 8 8 14.2 2.6 8Z" fill="currentColor" />;
  }

  return <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="2" {...stroke} />;
}
