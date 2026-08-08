"use client";

import React from "react";
import { WorkspaceLayout } from "@/components/foundation";
import { LoadingSkeleton } from "@/components/ui/states";
import type { ApiProject } from "@/features/projects";
import {
  ProjectHeader,
  type ProjectHeaderRenderer,
} from "./project-header";
import type { ProjectWorkspaceTabId } from "./project-tabs";

type ProjectLayoutProps = {
  activeTab: ProjectWorkspaceTabId;
  children: React.ReactNode;
  layout?: React.ComponentType<{ children: React.ReactNode }>;
  project: ApiProject;
  renderHeader?: ProjectHeaderRenderer;
};

/** Dense project shell for 13–15" laptop usability (Stage 0). */
export function CompactProjectWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceLayout spacing="compact">{children}</WorkspaceLayout>;
}

export function ProjectLayout({
  activeTab,
  children,
  layout: Layout = CompactProjectWorkspaceLayout,
  project,
  renderHeader,
}: ProjectLayoutProps) {
  const content = (
    <>
      <ProjectHeader
        activeTab={activeTab}
        project={project}
        render={renderHeader}
      />
      {children}
    </>
  );

  return <Layout>{content}</Layout>;
}

export function ProjectLayoutLoadingState() {
  return (
    <div aria-busy="true" className="space-y-3" role="status">
      <span className="sr-only">Loading project workspace</span>
      <LoadingSkeleton className="h-24 rounded-md border border-slate-200 bg-white shadow-soft" />
      <LoadingSkeleton className="h-72 rounded-md border border-slate-200 bg-white shadow-soft" />
    </div>
  );
}
