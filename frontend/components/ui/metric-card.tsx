import Link from "next/link";
import React from "react";

type MetricCardTone = "danger" | "default" | "success" | "warning";

type MetricCardProps = {
  detail?: string;
  href?: string;
  label: string;
  onClick?: () => void;
  tone?: MetricCardTone;
  value: number | string;
};

const toneStyles = {
  danger: {
    accent: "bg-status-danger-indicator",
    value: "text-status-danger",
  },
  default: { accent: "bg-slate-300", value: "text-slate-950" },
  success: {
    accent: "bg-status-success-indicator",
    value: "text-status-success",
  },
  warning: {
    accent: "bg-status-warning-indicator",
    value: "text-status-warning",
  },
};

export function MetricCard({
  detail,
  href,
  label,
  onClick,
  tone = "default",
  value,
}: MetricCardProps) {
  const className = `group relative overflow-hidden rounded-ui-lg border border-slate-200/80 bg-ui-surface p-4 text-slate-950 shadow-ui-subtle transition duration-ui ${
    href || onClick
      ? "cursor-pointer hover:-translate-y-px hover:border-slate-300 hover:shadow-md"
      : ""
  }`;
  const content = (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 ${toneStyles[tone].accent}`}
      />
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight ${toneStyles[tone].value}`}
      >
        {value}
      </p>
      {detail ? <p className="mt-2 text-sm text-slate-600">{detail}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link className={className} href={href} onClick={onClick}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button className={`${className} text-left`} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return <section className={className}>{content}</section>;
}
