import React from "react";
import type { ApiProjectDetails } from "@/features/projects";

type ProjectWorkspaceOverviewProps = {
  project: ApiProjectDetails;
};

export function ProjectWorkspaceOverview({
  project,
}: ProjectWorkspaceOverviewProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">
        Project Overview
      </h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <OverviewItem label="Project Name" value={project.name} />
        <OverviewItem
          label="Description"
          value={project.description || "No description"}
        />
        <OverviewItem label="Status" value={formatLabel(project.status)} />
        <OverviewItem
          label="Owner"
          value={
            project.owner
              ? `${project.owner.firstName} ${project.owner.lastName}`
              : "Unassigned"
          }
        />
        <OverviewItem
          label="Business Owner"
          value={formatUser(project.businessOwner)}
        />
        <OverviewItem
          label="Executive Sponsor"
          value={formatUser(project.executiveSponsor)}
        />
        <OverviewItem
          label="Delivery Lead"
          value={formatUser(project.deliveryLead)}
        />
        <OverviewItem
          label="Team Size"
          value={String(project.members?.length ?? 0)}
        />
      </dl>
    </section>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-semibold capitalize text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatUser(
  user?: {
    firstName: string;
    lastName: string;
  } | null,
) {
  return user ? `${user.firstName} ${user.lastName}` : 'Unassigned';
}
