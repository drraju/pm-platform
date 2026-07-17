import React from "react";
import { classNames } from "./classnames";
import { CountBadge } from "./status-badge";

type SectionHeaderLayout = "compact" | "responsive" | "timeline" | "wide";

type SectionHeaderProps = {
  action?: React.ReactNode;
  className?: string;
  count?: number;
  description?: string;
  descriptionSize?: "sm" | "xs";
  layout?: SectionHeaderLayout;
  title: string;
  titleId?: string;
};

const layoutStyles: Record<SectionHeaderLayout, string> = {
  compact:
    "flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between",
  responsive:
    "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
  timeline:
    "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
  wide: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
};

export function SectionHeader({
  action,
  className,
  count,
  description,
  descriptionSize = "sm",
  layout = "responsive",
  title,
  titleId,
}: SectionHeaderProps) {
  const trailingContent =
    action ?? (count !== undefined ? <CountBadge value={count} /> : null);

  return (
    <div className={classNames(layoutStyles[layout], className)}>
      <div>
        <h2 className="text-ui-section text-slate-950" id={titleId}>
          {title}
        </h2>
        {description ? (
          <p
            className={classNames(
              "mt-1 text-slate-500",
              descriptionSize === "xs"
                ? "text-xs leading-5"
                : "text-sm",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {trailingContent ? (
        <div className="shrink-0">{trailingContent}</div>
      ) : null}
    </div>
  );
}
