import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface WorkspaceSectionProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: "article" | "div" | "section";
  padding?: "compact" | "default" | "none";
  surface?: "card" | "plain" | "subtle";
}

const paddingStyles = {
  compact: "p-4",
  default: "p-5",
  none: "",
} as const;

const surfaceStyles = {
  card: "rounded-ui border border-ui-border bg-ui-surface shadow-ui-subtle",
  plain: "",
  subtle: "rounded-ui border border-slate-200/80 bg-slate-50",
} as const;

export function WorkspaceSection({
  as = "section",
  children,
  className,
  padding = "default",
  surface = "plain",
  ...props
}: WorkspaceSectionProps) {
  return React.createElement(
    as,
    {
      ...props,
      className: classNames(
        "min-w-0",
        surfaceStyles[surface],
        paddingStyles[padding],
        className,
      ),
    },
    children,
  );
}
