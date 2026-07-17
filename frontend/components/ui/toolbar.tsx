import React from "react";

export function ToolbarGroup({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div
      aria-label={`${label} commands`}
      className="flex items-center gap-1 border-l border-slate-200 pl-2 first:border-l-0 first:pl-0"
      role="group"
    >
      <span className="mr-1 hidden text-[10px] font-bold uppercase tracking-wide text-slate-500 xl:inline">
        {label}
      </span>
      {children}
    </div>
  );
}
