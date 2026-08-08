import React from "react";
import { classNames } from "@/components/ui/classnames";
import type {
  FoundationHeadingLevel,
  FoundationSectionElement,
} from "../types";

export interface SummaryCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  action?: React.ReactNode;
  as?: FoundationSectionElement;
  /** Compact density reduces padding for operational dashboards. */
  density?: "compact" | "default";
  description?: React.ReactNode;
  footer?: React.ReactNode;
  headingLevel?: FoundationHeadingLevel;
  title: React.ReactNode;
}

export const SummaryCard = React.forwardRef<HTMLElement, SummaryCardProps>(
  function SummaryCard(
    {
      action,
      as = "section",
      children,
      className,
      density = "default",
      description,
      footer,
      headingLevel = 2,
      title,
      ...props
    },
    ref,
  ) {
    const isCompact = density === "compact";
    const heading = React.createElement(
      `h${headingLevel}`,
      {
        className: classNames(
          "text-slate-950",
          isCompact ? "text-sm font-semibold" : "text-ui-section",
        ),
      },
      title,
    );

    return React.createElement(
      as,
      {
        ...props,
        className: classNames(
          "min-w-0 rounded-ui border border-slate-200/80 bg-ui-surface shadow-ui-subtle",
          isCompact ? "p-3" : "p-5",
          className,
        ),
        ref,
      },
      <>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {heading}
            {description ? (
              <div className="mt-1 text-sm leading-5 text-slate-600">
                {description}
              </div>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <div className={isCompact ? "mt-2" : "mt-4"}>{children}</div>
        {footer ? (
          <div
            className={classNames(
              "border-t border-slate-100",
              isCompact ? "mt-2 pt-2" : "mt-4 pt-3",
            )}
          >
            {footer}
          </div>
        ) : null}
      </>,
    );
  },
);
