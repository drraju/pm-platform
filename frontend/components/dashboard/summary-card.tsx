import React from "react";

type SummaryCardProps = {
  label: string;
  value: number;
  tone?: "default" | "warning" | "danger" | "success";
};

const toneStyles = {
  danger: "border-red-200 bg-red-50 text-red-700",
  default: "border-slate-200 bg-white text-slate-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

export function SummaryCard({ label, value, tone = "default" }: SummaryCardProps) {
  return (
    <section className={`rounded-md border p-5 shadow-soft ${toneStyles[tone]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </section>
  );
}
