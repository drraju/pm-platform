import Link from "next/link";
import React from "react";
import { classNames } from "@/components/ui/classnames";

export type SummaryMetricCardVariant =
  | "critical"
  | "neutral"
  | "primary"
  | "success"
  | "warning";

export interface SummaryMetricCardTrend {
  direction: "down" | "flat" | "up";
  label: string;
}

interface SummaryMetricCardCommonProps {
  ariaLabel?: string;
  className?: string;
  delta?: React.ReactNode;
  /** Compact density reduces padding and value size for operational dashboards. */
  density?: "compact" | "default";
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  title: React.ReactNode;
  trend?: SummaryMetricCardTrend;
  value: React.ReactNode;
  variant?: SummaryMetricCardVariant;
}

export interface StaticSummaryMetricCardProps
  extends SummaryMetricCardCommonProps {
  disabled?: never;
  href?: never;
  onClick?: never;
}

export interface LinkSummaryMetricCardProps
  extends SummaryMetricCardCommonProps {
  disabled?: never;
  href: string;
  onClick?: never;
}

export interface ButtonSummaryMetricCardProps
  extends SummaryMetricCardCommonProps {
  disabled?: boolean;
  href?: never;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export type SummaryMetricCardProps =
  | ButtonSummaryMetricCardProps
  | LinkSummaryMetricCardProps
  | StaticSummaryMetricCardProps;

const variantStyles: Record<
  SummaryMetricCardVariant,
  { accent: string; value: string }
> = {
  critical: {
    accent: "bg-status-danger-indicator",
    value: "text-status-danger",
  },
  neutral: { accent: "bg-slate-300", value: "text-slate-950" },
  primary: { accent: "bg-brand", value: "text-brand" },
  success: {
    accent: "bg-status-success-indicator",
    value: "text-status-success-strong",
  },
  warning: {
    accent: "bg-status-warning-indicator",
    value: "text-status-warning-strong",
  },
};

const trendSymbols = { down: "↓", flat: "→", up: "↑" } as const;

export function SummaryMetricCard({
  ariaLabel,
  className,
  delta,
  density = "default",
  disabled,
  detail,
  href,
  icon,
  onClick,
  title,
  trend,
  value,
  variant = "neutral",
}: SummaryMetricCardProps) {
  const isInteractive = Boolean(href || onClick);
  const isCompact = density === "compact";
  const rootClassName = classNames(
    "group relative min-w-0 overflow-hidden rounded-ui border border-slate-200/80 bg-ui-surface text-left shadow-ui-subtle transition duration-ui",
    isCompact ? "p-2.5" : "p-4",
    isInteractive &&
      "cursor-pointer hover:-translate-y-px hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand/30",
    className,
  );
  const content = (
    <>
      <span
        aria-hidden="true"
        className={classNames(
          "absolute inset-x-0 top-0 h-0.5",
          variantStyles[variant].accent,
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div
          className={classNames(
            "min-w-0 font-medium text-slate-600",
            isCompact ? "text-xs" : "text-sm",
          )}
        >
          {title}
        </div>
        {icon ? <div className="shrink-0 text-slate-500">{icon}</div> : null}
      </div>
      <div
        className={classNames(
          "font-semibold tracking-tight",
          isCompact ? "mt-1 text-xl" : "mt-2 text-3xl",
          variantStyles[variant].value,
        )}
      >
        {value}
      </div>
      {trend || delta ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
          {trend ? (
            <span aria-label={trend.label}>
              <span aria-hidden="true">{trendSymbols[trend.direction]} </span>
              {trend.label}
            </span>
          ) : null}
          {delta ? <span>{delta}</span> : null}
        </div>
      ) : null}
      {detail ? <div className="mt-2 text-sm text-slate-600">{detail}</div> : null}
    </>
  );

  if (href) {
    return (
      <Link
        aria-label={ariaLabel}
        className={rootClassName}
        href={href}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        aria-label={ariaLabel}
        className={rootClassName}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <section aria-label={ariaLabel} className={rootClassName}>
      {content}
    </section>
  );
}
