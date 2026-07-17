import Link from "next/link";
import React from "react";
import { SectionCard } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

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
    <SectionCard aria-labelledby="timeline-snapshot-title">
      <SectionHeader
        action={
          <Link
          className="shrink-0 text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
          href={planningHref}
        >
          Open in Planning
          </Link>
        }
        description="Key Project checkpoints. Dates are not shown to scale."
        descriptionSize="xs"
        layout="timeline"
        title="Timeline Snapshot"
        titleId="timeline-snapshot-title"
      />

      <ol
        aria-label="Project timeline checkpoints"
        className="mt-6 grid gap-0 xl:grid-cols-5"
      >
        {items.map((item, index) => (
          <li
            aria-current={item.isCurrent ? "date" : undefined}
            className="relative grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0 xl:block xl:pb-0 xl:pr-4"
            key={item.label}
          >
            {index < items.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[0.45rem] top-3 h-full w-px bg-slate-200 xl:left-2 xl:top-[0.45rem] xl:h-px xl:w-full"
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`relative z-10 mt-1 block size-4 rounded-full border-2 ${
                item.isCurrent
                  ? "border-brand bg-brand"
                  : "border-slate-300 bg-white"
              }`}
            />
            <div className="min-w-0 xl:mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
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
    </SectionCard>
  );
}
