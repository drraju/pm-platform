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
    <span className="inline-flex shrink-0" title={outlineRoleHint(role, subtask)}>
      <svg
        aria-label={label}
        className={`size-3.5 ${checkpoint ? "text-slate-800" : "text-slate-500"}`}
        fill="none"
        role="img"
        viewBox="0 0 16 16"
      >
        {markShape(role, subtask)}
      </svg>
    </span>
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
        <path d="M3.4 2.2v11.6" {...stroke} />
        <path d="M3.4 3.1h7.4v4.6H3.4" {...stroke} />
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
    return (
      <>
        <path d="M3 13.6V3.2M13 13.6V3.2M3 3.2h10" {...stroke} />
        <path d="M4.4 3.2v3.4h7.2V3.2" {...stroke} />
      </>
    );
  }

  return <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="2" {...stroke} />;
}

export function PlusIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 16 16">
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 16 16">
      <path d="M3.4 4.6h9.2" />
      <path d="M6.2 4.5V3.1h3.6v1.4" />
      <path d="M4.6 4.6l.5 8.3h6l.5-8.3" />
      <path d="M7 6.6v4.2M9 6.6v4.2" />
    </svg>
  );
}
