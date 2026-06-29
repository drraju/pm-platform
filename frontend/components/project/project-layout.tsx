"use client";

import React from "react";
import type { ApiProject } from "@/features/projects";
import { ProjectHeader } from "./project-header";
import type { ProjectWorkspaceTabId } from "./project-tabs";

type ProjectLayoutProps = {
  activeTab: ProjectWorkspaceTabId;
  children: React.ReactNode;
  project: ApiProject;
};

export function ProjectLayout({
  activeTab,
  children,
  project,
}: ProjectLayoutProps) {
  return (
    <div className="space-y-6">
      <ProjectHeader activeTab={activeTab} project={project} />
      {children}
    </div>
  );
}

export function ProjectLayoutLoadingState() {
  return (
    <div className="space-y-6">
      <section className="h-48 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
      <section className="h-80 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
    </div>
  );
}
