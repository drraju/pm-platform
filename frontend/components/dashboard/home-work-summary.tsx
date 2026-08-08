import Link from "next/link";
import React from "react";

export type HomeWorkSummaryMetric = {
  href: string;
  id: string;
  label: string;
  value: number;
  variant?: "critical" | "neutral" | "warning";
};

type HomeWorkSummaryProps = {
  metrics: readonly HomeWorkSummaryMetric[];
};

const valueTone: Record<
  NonNullable<HomeWorkSummaryMetric["variant"]>,
  string
> = {
  critical: "text-status-danger",
  neutral: "text-slate-950",
  warning: "text-status-warning-strong",
};

export function HomeWorkSummary({ metrics }: HomeWorkSummaryProps) {
  return (
    <div
      aria-label="Work summary"
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
      role="group"
    >
      {metrics.map((metric, index) => (
        <React.Fragment key={metric.id}>
          {index > 0 ? (
            <span aria-hidden="true" className="text-slate-300">
              |
            </span>
          ) : null}
          <Link
            aria-label={`${metric.label} tasks: ${metric.value}`}
            className="inline-flex min-w-0 items-baseline gap-1.5 rounded-sm px-0.5 py-0.5 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand/30"
            href={metric.href}
          >
            <span className="text-xs font-medium text-slate-600">
              {metric.label}
            </span>
            <span
              className={[
                "min-w-[1.25rem] text-base font-semibold tabular-nums tracking-tight",
                valueTone[metric.variant ?? "neutral"],
              ].join(" ")}
            >
              {metric.value}
            </span>
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
}
