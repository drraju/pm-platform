import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface WorkspaceHeaderActionsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function WorkspaceHeaderActions({
  children,
  className,
  label = "Workspace actions",
  ...props
}: WorkspaceHeaderActionsProps) {
  return (
    <div
      aria-label={label}
      className={classNames(
        "flex flex-wrap items-center gap-2 sm:justify-end",
        className,
      )}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
}
