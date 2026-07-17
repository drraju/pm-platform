import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface WorkspaceContentProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section";
  /** Controls spacing between sections inside the workspace content region. */
  spacing?: "compact" | "default" | "none";
}

const spacingStyles = {
  compact: "space-y-4",
  default: "space-y-6",
  none: "",
} as const;

export const WorkspaceContent = React.forwardRef<
  HTMLElement,
  WorkspaceContentProps
>(function WorkspaceContent(
  { as = "div", children, className, spacing = "default", ...props },
  ref,
) {
  return React.createElement(
    as,
    {
      ...props,
      className: classNames("min-w-0", spacingStyles[spacing], className),
      ref,
    },
    children,
  );
});
