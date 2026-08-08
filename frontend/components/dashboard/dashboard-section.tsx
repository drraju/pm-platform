import React from "react";
import {
  EmptyState,
  StatusBadge,
  SummaryCard,
} from "@/components/foundation";

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
    <SummaryCard
      action={
        <StatusBadge
          aria-label={`${items.length} ${title.toLowerCase()}`}
          size="sm"
        >
          {items.length}
        </StatusBadge>
      }
      density="compact"
      title={title}
    >
      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <EmptyState
            as="div"
            compact
            description={emptyMessage}
            headingLevel={3}
            title="Nothing to show"
          />
        ) : (
          items.map((item, index) => (
            <div className="py-2 first:pt-0 last:pb-0" key={index}>
              {renderItem(item)}
            </div>
          ))
        )}
      </div>
    </SummaryCard>
  );
}
