import React from "react";
import type { ApiRaidItem } from "@/features/projects";

type RegisterColumn = {
  header: string;
  render: (item: ApiRaidItem) => string;
};

type ProjectWorkspaceRegisterSectionProps = {
  columns: RegisterColumn[];
  description: string;
  emptyMessage: string;
  items: ApiRaidItem[];
  title: string;
};

export function ProjectWorkspaceRegisterSection({
  columns,
  description,
  emptyMessage,
  items,
  title,
}: ProjectWorkspaceRegisterSectionProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {items.length}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th className="px-3 py-3" key={column.header}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-slate-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {items.map((item) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function formatRaidLabel(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return value.replaceAll("_", " ");
}

export function formatRaidOwner(item: ApiRaidItem) {
  if (!item.owner) {
    return "Unassigned";
  }

  return `${item.owner.firstName} ${item.owner.lastName}`;
}
