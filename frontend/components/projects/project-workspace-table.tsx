import React from "react";

export type ProjectWorkspaceTableColumn<TItem> = {
  header: string;
  render: (item: TItem) => string;
};

type ProjectWorkspaceTableProps<TItem extends { id: string }> = {
  ariaLabel: string;
  columns: ProjectWorkspaceTableColumn<TItem>[];
  emptyMessage: string;
  isLoading?: boolean;
  items: TItem[];
};

export function ProjectWorkspaceTable<TItem extends { id: string }>({
  ariaLabel,
  columns,
  emptyMessage,
  isLoading = false,
  items,
}: ProjectWorkspaceTableProps<TItem>) {
  return (
    <div
      aria-label={ariaLabel}
      className="mt-5 overflow-x-auto rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/30"
      role="region"
      tabIndex={0}
    >
      <table className="min-w-[640px] divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th className="px-3 py-3" key={column.header} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <ProjectWorkspaceTableLoadingRows columnCount={columns.length} />
          ) : null}
          {!isLoading && items.length === 0 ? (
            <tr>
              <td className="px-3 py-5 text-slate-500" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : null}
          {!isLoading
            ? items.map((item) => (
                <tr key={item.id}>
                  {columns.map((column, index) => (
                    <td
                      className={
                        index === 0
                          ? "px-3 py-3 font-semibold text-slate-950"
                          : "px-3 py-3 capitalize text-slate-600"
                      }
                      key={`${item.id}-${column.header}`}
                    >
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  );
}

function ProjectWorkspaceTableLoadingRows({
  columnCount,
}: {
  columnCount: number;
}) {
  return (
    <>
      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columnCount }).map((__, columnIndex) => (
            <td className="px-3 py-4" key={columnIndex}>
              <div className="h-4 animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
