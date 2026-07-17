import React from "react";
import { MetricCard } from "@/components/ui/metric-card";

type StatCardProps = {
  label: string;
  value: string;
  trend: string;
};

export function StatCard({ label, value, trend }: StatCardProps) {
  return <MetricCard detail={trend} label={label} value={value} />;
}
