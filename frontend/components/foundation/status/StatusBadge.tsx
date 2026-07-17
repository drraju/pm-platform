import React, { useId } from "react";
import { classNames } from "@/components/ui/classnames";

export type StatusBadgeTone =
  | "critical"
  | "neutral"
  | "success"
  | "warning";

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  description?: string;
  dot?: boolean;
  size?: "md" | "sm";
  tone?: StatusBadgeTone;
}

const toneStyles: Record<StatusBadgeTone, string> = {
  critical:
    "border-status-danger-border/80 bg-status-danger-surface/70 text-status-danger",
  neutral: "border-slate-200 bg-slate-100 text-slate-600",
  success:
    "border-status-success-border/80 bg-status-success-surface/70 text-status-success-strong",
  warning:
    "border-status-warning-border/80 bg-status-warning-surface/70 text-status-warning-strong",
};

const dotStyles: Record<StatusBadgeTone, string> = {
  critical: "bg-status-danger-indicator",
  neutral: "bg-slate-400",
  success: "bg-status-success-indicator",
  warning: "bg-status-warning-indicator",
};

export function StatusBadge({
  children,
  className,
  description,
  dot = false,
  size = "md",
  tone = "neutral",
  ...props
}: StatusBadgeProps) {
  const descriptionId = useId();

  return (
    <span className="inline-flex flex-col items-start">
      <span
        aria-describedby={description ? descriptionId : undefined}
        className={classNames(
          "inline-flex w-fit items-center rounded-full border font-semibold",
          size === "sm" ? "min-h-6 px-2 py-0.5 text-xs" : "min-h-7 px-2.5 py-1 text-xs",
          toneStyles[tone],
          className,
        )}
        {...props}
      >
        {dot ? (
          <span
            aria-hidden="true"
            className={classNames("mr-1.5 size-1.5 rounded-full", dotStyles[tone])}
          />
        ) : null}
        {children}
      </span>
      {description ? (
        <span className="sr-only" id={descriptionId}>
          {description}
        </span>
      ) : null}
    </span>
  );
}
