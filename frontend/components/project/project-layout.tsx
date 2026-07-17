"use client";

import React from "react";
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

export function ProjectLayout({
  activeTab,
  children,
  layout: Layout,
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

  if (Layout) {
    return <Layout>{content}</Layout>;
  }

  return <div className="space-y-6">{content}</div>;
}

export function ProjectLayoutLoadingState() {
  return (
    <div aria-busy="true" className="space-y-6" role="status">
      <span className="sr-only">Loading project workspace</span>
      <LoadingSkeleton className="h-48 rounded-md border border-slate-200 bg-white shadow-soft" />
      <LoadingSkeleton className="h-80 rounded-md border border-slate-200 bg-white shadow-soft" />
    </div>
  );
}
