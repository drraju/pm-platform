import React from "react";
import { classNames } from "@/components/ui/classnames";
import type {
  FoundationHeadingLevel,
  FoundationSectionElement,
} from "../types";

export type InfoCardTone = "neutral" | "success" | "warning";

export interface InfoCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  action?: React.ReactNode;
  as?: FoundationSectionElement;
  headingLevel?: FoundationHeadingLevel;
  icon?: React.ReactNode;
  title: React.ReactNode;
  tone?: InfoCardTone;
}

const toneStyles: Record<InfoCardTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success:
    "border-status-success-border bg-status-success-surface/70 text-status-success-strong",
  warning:
    "border-status-warning-border bg-status-warning-surface/70 text-status-warning-strong",
};

export const InfoCard = React.forwardRef<HTMLElement, InfoCardProps>(
  function InfoCard(
    {
      action,
      as = "aside",
      children,
      className,
      headingLevel = 3,
      icon,
      title,
      tone = "neutral",
      ...props
    },
    ref,
  ) {
    const heading = React.createElement(
      `h${headingLevel}`,
      { className: "text-sm font-semibold" },
      title,
    );

    return React.createElement(
      as,
      {
        ...props,
        className: classNames(
          "rounded-ui border p-4",
          toneStyles[tone],
          className,
        ),
        ref,
      },
      <div className="flex items-start gap-3">
        {icon ? <div className="shrink-0" aria-hidden="true">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          {heading}
          <div className="mt-1 text-sm leading-5">{children}</div>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>,
    );
  },
);
