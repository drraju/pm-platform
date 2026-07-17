import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface WorkspaceContentProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section";
  spacing?: "compact" | "default" | "none";
}

const spacingStyles = {
  compact: "space-y-4",
  default: "space-y-6",
  none: "",
} as const;

export function WorkspaceContent({
  as = "div",
  children,
  className,
  spacing = "default",
  ...props
}: WorkspaceContentProps) {
  return React.createElement(
    as,
    {
      ...props,
      className: classNames("min-w-0", spacingStyles[spacing], className),
    },
    children,
  );
}
