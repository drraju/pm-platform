import React from "react";
import { classNames } from "@/components/ui/classnames";

export interface WorkspaceHeaderMetadataItem {
  id: string;
  label: string;
  value: React.ReactNode;
}

export interface WorkspaceHeaderProgress {
  label: string;
  value: number;
}

export interface WorkspaceHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  metadata?: readonly WorkspaceHeaderMetadataItem[];
  navigation?: React.ReactNode;
  progress?: WorkspaceHeaderProgress;
  status?: React.ReactNode;
  subtitle?: React.ReactNode;
  title: React.ReactNode;
}

export function WorkspaceHeader({
  actions,
  className,
  eyebrow,
  metadata = [],
  navigation,
  progress,
  status,
  subtitle,
  title,
  ...props
}: WorkspaceHeaderProps) {
  const progressValue = progress
    ? Math.min(100, Math.max(0, progress.value))
    : null;

  return (
    <header
      className={classNames(
        "overflow-hidden rounded-ui border border-ui-border bg-ui-surface shadow-ui-subtle",
        className,
      )}
      {...props}
    >
      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {eyebrow}
            </div>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            {status}
          </div>
          {subtitle ? (
            <div className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">
              {subtitle}
            </div>
          ) : null}
        </div>
        {actions ? <div className="min-w-0">{actions}</div> : null}
      </div>

      {metadata.length > 0 || progress ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {metadata.length > 0 ? (
              <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                {metadata.map((item) => (
                  <div className="min-w-0" key={item.id}>
                    <dt className="text-xs font-medium text-slate-500">
                      {item.label}
                    </dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {progress && progressValue !== null ? (
              <div className="w-full shrink-0 lg:w-48">
                <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
                  <span>{progress.label}</span>
                  <span>{progressValue}%</span>
                </div>
                <progress
                  aria-label={progress.label}
                  className="mt-1 h-2 w-full accent-brand"
                  max={100}
                  value={progressValue}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {navigation ? <div className="px-4">{navigation}</div> : null}
    </header>
  );
}
