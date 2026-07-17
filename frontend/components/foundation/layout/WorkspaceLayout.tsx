import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface WorkspaceLayoutProps
  extends React.HTMLAttributes<HTMLDivElement> {
  density?: "compact" | "comfortable";
}

export function WorkspaceLayout({
  children,
  className,
  density = "comfortable",
  ...props
}: WorkspaceLayoutProps) {
  return (
    <div
      className={classNames(
        "min-w-0",
        density === "compact" ? "space-y-4" : "space-y-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
