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
      description,
      footer,
      headingLevel = 2,
      title,
      ...props
    },
    ref,
  ) {
    const heading = React.createElement(
      `h${headingLevel}`,
      { className: "text-ui-section text-slate-950" },
      title,
    );

    return React.createElement(
      as,
      {
        ...props,
        className: classNames(
          "min-w-0 rounded-ui border border-slate-200/80 bg-ui-surface p-5 shadow-ui-subtle",
          className,
        ),
        ref,
      },
      <>
        <div className="flex items-start justify-between gap-4">
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
        <div className="mt-4">{children}</div>
        {footer ? (
          <div className="mt-4 border-t border-slate-100 pt-3">{footer}</div>
        ) : null}
      </>,
    );
  },
);
