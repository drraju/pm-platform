import React from "react";
import { classNames } from "@/components/ui/classnames";
import type {
  FoundationHeadingLevel,
  FoundationSectionElement,
} from "../types";

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  action?: React.ReactNode;
  as?: FoundationSectionElement;
  compact?: boolean;
  description?: React.ReactNode;
  headingLevel?: FoundationHeadingLevel;
  icon?: React.ReactNode;
  title: React.ReactNode;
}

export function EmptyState({
  action,
  as = "section",
  className,
  compact = false,
  description,
  headingLevel = 2,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  const heading = React.createElement(
    `h${headingLevel}`,
    { className: "text-sm font-semibold text-slate-900" },
    title,
  );

  return React.createElement(
    as,
    {
      ...props,
      className: classNames(
        "rounded-ui border border-dashed border-slate-300 bg-slate-50 text-center",
        compact ? "px-4 py-4" : "px-5 py-8",
        className,
      ),
    },
    <>
      {icon ? (
        <div aria-hidden="true" className="mx-auto mb-3 w-fit text-slate-400">
          {icon}
        </div>
      ) : null}
      {heading}
      {description ? (
        <div className="mx-auto mt-1 max-w-xl text-sm leading-5 text-slate-600">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </>,
  );
}
