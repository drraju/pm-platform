import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  action?: React.ReactNode;
  compact?: boolean;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
}

export function EmptyState({
  action,
  className,
  compact = false,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <section
      className={classNames(
        "rounded-ui border border-dashed border-slate-300 bg-slate-50 text-center",
        compact ? "px-4 py-4" : "px-5 py-8",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div aria-hidden="true" className="mx-auto mb-3 w-fit text-slate-400">
          {icon}
        </div>
      ) : null}
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {description ? (
        <div className="mx-auto mt-1 max-w-xl text-sm leading-5 text-slate-600">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
