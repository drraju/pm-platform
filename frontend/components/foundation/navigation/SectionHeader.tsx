import Link from "next/link";
import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface SectionHeaderLink {
  href: string;
  label: string;
}

export interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  description?: React.ReactNode;
  headingLevel?: 2 | 3 | 4;
  link?: SectionHeaderLink;
  title: React.ReactNode;
  titleId?: string;
}

export function SectionHeader({
  actions,
  badge,
  className,
  description,
  headingLevel = 2,
  link,
  title,
  titleId,
  ...props
}: SectionHeaderProps) {
  const heading = React.createElement(
    `h${headingLevel}`,
    {
      className: "text-ui-section text-slate-950",
      id: titleId,
    },
    title,
  );

  return (
    <div
      className={classNames(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {heading}
          {badge}
        </div>
        {description ? (
          <div className="mt-1 text-sm leading-5 text-slate-600">
            {description}
          </div>
        ) : null}
      </div>
      {actions || link ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          {link ? (
            <Link
              className="rounded-sm text-sm font-semibold text-brand hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-brand/30"
              href={link.href}
            >
              {link.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
