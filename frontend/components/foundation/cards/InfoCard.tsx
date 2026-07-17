import React from "react";
import { classNames } from "@/components/ui/classnames";

export type InfoCardTone = "neutral" | "success" | "warning";

export interface InfoCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  action?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
  tone?: InfoCardTone;
}

const toneStyles: Record<InfoCardTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success:
    "border-status-success-border bg-status-success-surface/70 text-status-success-strong",
  warning:
    "border-status-warning-border bg-status-warning-surface/70 text-status-warning-strong",
};

export function InfoCard({
  action,
  children,
  className,
  icon,
  title,
  tone = "neutral",
  ...props
}: InfoCardProps) {
  return (
    <aside
      className={classNames(
        "rounded-ui border p-4",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="shrink-0" aria-hidden="true">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <div className="mt-1 text-sm leading-5">{children}</div>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </aside>
  );
}
