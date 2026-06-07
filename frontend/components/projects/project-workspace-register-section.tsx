import React from "react";
import {
  ProjectWorkspaceTable,
  type ProjectWorkspaceTableColumn,
} from "@/components/projects/project-workspace-table";
import type { ApiRaidItem } from "@/features/projects";

type RegisterColumn = ProjectWorkspaceTableColumn<ApiRaidItem>;

type ProjectWorkspaceRegisterSectionProps = {
  columns: RegisterColumn[];
  description: string;
  emptyMessage: string;
  isLoading?: boolean;
  items: ApiRaidItem[];
  title: string;
};

export function ProjectWorkspaceRegisterSection({
  columns,
  description,
  emptyMessage,
  isLoading = false,
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

      <ProjectWorkspaceTable
        columns={columns}
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        items={items}
      />
    </section>
  );
}

export function formatRaidLabel(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return value.replaceAll("_", " ");
}

export function formatRaidDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatRaidOwner(item: ApiRaidItem) {
  if (!item.owner) {
    return "Unassigned";
  }

  return `${item.owner.firstName} ${item.owner.lastName}`;
}
