import React from "react";
import { classNames } from "./classnames";

type DisclosureButtonProps = {
  expanded: boolean;
  label: string;
  onClick: () => void;
  className?: string;
};

export function DisclosureButton({
  className,
  expanded,
  label,
  onClick,
}: DisclosureButtonProps) {
  return (
    <button
      aria-expanded={expanded}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
      className={classNames(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand/30",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      <span aria-hidden="true" className="text-[0.7rem] leading-none">
        {expanded ? "▾" : "▸"}
      </span>
    </button>
  );
}
