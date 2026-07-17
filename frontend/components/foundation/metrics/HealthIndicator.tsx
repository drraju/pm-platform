import React from "react";
import { classNames } from "@/components/ui/classnames";

export type HealthIndicatorTone =
  | "critical"
  | "neutral"
  | "success"
  | "warning";

export interface HealthIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  description?: React.ReactNode;
  label: React.ReactNode;
  tone?: HealthIndicatorTone;
  value: React.ReactNode;
}

const indicatorStyles: Record<HealthIndicatorTone, string> = {
  critical: "bg-status-danger-indicator",
  neutral: "bg-slate-400",
  success: "bg-status-success-indicator",
  warning: "bg-status-warning-indicator",
};

export function HealthIndicator({
  className,
  description,
  label,
  tone = "neutral",
  value,
  ...props
}: HealthIndicatorProps) {
  return (
    <div className={classNames("min-w-0", className)} {...props}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-950">
        <span
          aria-hidden="true"
          className={classNames("size-2 shrink-0 rounded-full", indicatorStyles[tone])}
        />
        <span>{value}</span>
      </div>
      {description ? (
        <div className="mt-1 text-xs leading-5 text-slate-600">
          {description}
        </div>
      ) : null}
    </div>
  );
}
