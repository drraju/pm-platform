import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface LoadingStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
  label?: string;
  rows?: number;
}

export function LoadingState({
  className,
  compact = false,
  label = "Loading content",
  rows = 3,
  ...props
}: LoadingStateProps) {
  const rowCount = Math.max(1, Math.min(6, rows));

  return (
    <div
      aria-busy="true"
      className={classNames("space-y-3", compact && "space-y-2", className)}
      role="status"
      {...props}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rowCount }, (_, index) => (
        <span
          aria-hidden="true"
          className={classNames(
            "block animate-pulse rounded bg-slate-200 motion-reduce:animate-none",
            compact ? "h-3" : "h-4",
            index === rowCount - 1 ? "w-2/3" : "w-full",
          )}
          key={index}
        />
      ))}
    </div>
  );
}
