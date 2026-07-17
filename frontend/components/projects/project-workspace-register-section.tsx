import React from "react";
import { SectionCard } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
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
    <SectionCard>
      <SectionHeader
        count={items.length}
        description={description}
        layout="compact"
        title={title}
      />

      <ProjectWorkspaceTable
        columns={columns}
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        items={items}
      />
    </SectionCard>
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
