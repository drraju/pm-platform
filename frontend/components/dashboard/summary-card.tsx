import React from "react";
import Link from "next/link";

type SummaryCardProps = {
  href?: string;
  label: string;
  onClick?: () => void;
  value: number;
  tone?: "default" | "warning" | "danger" | "success";
};

const toneStyles = {
  danger: "border-red-200 bg-red-50 text-red-700",
  default: "border-slate-200 bg-white text-slate-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

export function SummaryCard({
  href,
  label,
  onClick,
  value,
  tone = "default",
}: SummaryCardProps) {
  const className = `rounded-md border p-5 shadow-soft transition ${
    href || onClick ? "cursor-pointer hover:shadow-md" : ""
  } ${toneStyles[tone]}`;
  const content = (
    <>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
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
