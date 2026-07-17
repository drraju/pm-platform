import React from "react";
import { classNames } from "./classnames";

export type StatusTone = "danger" | "neutral" | "success" | "warning";

type StatusBadgeProps = {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  title?: string;
  tone?: StatusTone;
};

const toneStyles: Record<StatusTone, string> = {
  danger:
    "border-status-danger-border/80 bg-status-danger-surface/70 text-status-danger",
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
  success:
    "border-status-success-border/80 bg-status-success-surface/70 text-status-success-strong",
  warning:
    "border-status-warning-border/80 bg-status-warning-surface/70 text-status-warning-strong",
};

const dotStyles: Record<StatusTone, string> = {
  danger: "bg-status-danger-indicator",
  neutral: "bg-slate-400",
  success: "bg-status-success-indicator",
  warning: "bg-status-warning-indicator",
};

export function StatusBadge({
  children,
  className,
  dot = false,
  title,
  tone = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex min-h-7 w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneStyles[tone],
        className,
      )}
      title={title}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={classNames("mr-1.5 size-1.5 rounded-full", dotStyles[tone])}
        />
      ) : null}
      {children}
    </span>
  );
}

export function CountBadge({
  shape = "rounded",
  value,
}: {
  shape?: "pill" | "rounded";
  value: number;
}) {
  return (
    <span
      className={classNames(
        "inline-flex min-w-7 items-center justify-center bg-slate-100 py-1 text-xs font-semibold tabular-nums text-slate-600",
        shape === "pill" ? "rounded-full px-2" : "rounded-md px-2.5",
      )}
    >
      {value}
    </span>
  );
}
