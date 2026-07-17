import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface ActionToolbarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  filters?: React.ReactNode;
  label: string;
  overflowMenu?: React.ReactNode;
  primaryAction?: React.ReactNode;
  search?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  sticky?: boolean;
}

export function ActionToolbar({
  className,
  filters,
  label,
  overflowMenu,
  primaryAction,
  search,
  secondaryActions,
  sticky = false,
  ...props
}: ActionToolbarProps) {
  return (
    <div
      aria-label={label}
      className={classNames(
        "flex min-w-0 flex-col gap-3 rounded-ui border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between",
        sticky && "sticky top-0 z-10",
        className,
      )}
      role="group"
      {...props}
    >
      {search || filters ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {search ? <div className="min-w-0 flex-1">{search}</div> : null}
          {filters ? <div className="flex flex-wrap items-center gap-2">{filters}</div> : null}
        </div>
      ) : null}
      {secondaryActions || primaryAction || overflowMenu ? (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {secondaryActions}
          {primaryAction}
          {overflowMenu}
        </div>
      ) : null}
    </div>
  );
}
