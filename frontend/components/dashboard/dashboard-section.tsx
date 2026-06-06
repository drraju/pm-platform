import React from "react";

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
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {items.length}
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {items.length === 0 ? (
          <p className="py-5 text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          items.map((item, index) => (
            <div className="py-3" key={index}>
              {renderItem(item)}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
