import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface KPIGridProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section";
  columns?: 2 | 3 | 4;
  gap?: "compact" | "default";
}

const columnStyles = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
} as const;

export function KPIGrid({
  as = "section",
  children,
  className,
  columns = 4,
  gap = "default",
  ...props
}: KPIGridProps) {
  return React.createElement(
    as,
    {
      ...props,
      className: classNames(
        "grid",
        gap === "compact" ? "gap-3" : "gap-4",
        columnStyles[columns],
        className,
      ),
    },
    children,
  );
}
