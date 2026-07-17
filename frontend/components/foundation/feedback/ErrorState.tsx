import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface ErrorStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  action?: React.ReactNode;
  message: React.ReactNode;
  title?: React.ReactNode;
}

export function ErrorState({
  action,
  className,
  message,
  title = "Something went wrong",
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={classNames(
        "rounded-ui border border-status-danger-border bg-status-danger-surface px-4 py-3 text-status-danger",
        className,
      )}
      role="alert"
      {...props}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-5">{message}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
