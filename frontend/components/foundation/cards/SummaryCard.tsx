import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface SummaryCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  action?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  title: React.ReactNode;
}

export function SummaryCard({
  action,
  children,
  className,
  description,
  footer,
  title,
  ...props
}: SummaryCardProps) {
  return (
    <section
      className={classNames(
        "min-w-0 rounded-ui border border-slate-200/80 bg-ui-surface p-5 shadow-ui-subtle",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-ui-section text-slate-950">{title}</h2>
          {description ? (
            <div className="mt-1 text-sm leading-5 text-slate-600">
              {description}
            </div>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
      {footer ? (
        <div className="mt-4 border-t border-slate-100 pt-3">{footer}</div>
      ) : null}
    </section>
  );
}
