import React from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { CountBadge } from "@/components/ui/status-badge";

type DashboardSectionProps<T> = {
  emptyMessage: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  title: string;
};

export function DashboardSection<T>({
  emptyMessage,
  items,
  renderItem,
  title,
}: DashboardSectionProps<T>) {
  return (
    <Card variant="subtle">
      <div className="flex items-center justify-between gap-4">
        <h2 className="px-5 pt-4 text-base font-semibold text-slate-950 sm:px-6">
          {title}
        </h2>
        <span className="mr-5 mt-4 sm:mr-6">
          <CountBadge shape="pill" value={items.length} />
        </span>
      </div>

      <div className="mt-3 divide-y divide-slate-100 px-5 pb-2 sm:px-6">
        {items.length === 0 ? (
          <EmptyState className="py-5 leading-6 text-slate-600">
            {emptyMessage}
          </EmptyState>
        ) : (
          items.map((item, index) => (
            <div className="py-3.5" key={index}>
              {renderItem(item)}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
