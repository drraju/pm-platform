import Link from "next/link";
import React from "react";
import { SummaryCard } from "@/components/foundation";
import { classNames } from "@/components/ui/classnames";

export type TimelineSnapshotItem = {
  date: string;
  isCurrent?: boolean;
  label: string;
  status?: string;
};

type TimelineSnapshotProps = {
  items: TimelineSnapshotItem[];
  planningHref: string;
};

export function TimelineSnapshot({
  items,
  planningHref,
}: TimelineSnapshotProps) {
  return (
    <SummaryCard
      density="compact"
      action={
        <Link
          className="shrink-0 text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
          href={planningHref}
        >
          Open in Planning
        </Link>
      }
      description="Key checkpoints in delivery order. Dates are not shown to scale."
      title="Timeline Snapshot"
    >
      <div className="overflow-x-auto">
        <ol
          aria-label="Project timeline checkpoints"
          className="flex min-w-max gap-3 pb-1"
        >
          {items.map((item) => (
            <li
              aria-current={item.isCurrent ? "date" : undefined}
              className="w-[12rem] shrink-0"
              key={item.label}
            >
              <div
                className={classNames(
                  "flex h-full flex-col rounded-ui border p-3 shadow-ui-subtle",
                  item.isCurrent
                    ? "border-brand/30 bg-brand/5"
                    : "border-slate-200 bg-white",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={classNames(
                      "size-2.5 shrink-0 rounded-full",
                      item.isCurrent ? "bg-brand" : "bg-slate-300",
                    )}
                  />
                  <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {item.date}
                </p>
                {item.status ? (
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {item.status}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </SummaryCard>
  );
}
