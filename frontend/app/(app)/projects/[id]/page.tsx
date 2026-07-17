"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ErrorState,
  LoadingState,
  WorkspaceHeader,
  WorkspaceLayout,
} from "@/components/foundation";
import { ProjectLayout } from "@/components/project";
import { ProjectWorkspaceOverview } from "@/components/projects/project-workspace-overview";
import { getProject, type ApiProjectDetails } from "@/features/projects";

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      setError(null);
      setIsLoading(true);
      try {
        setProject(await getProject(projectId));
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load project overview",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  if (isLoading) {
    return (
      <WorkspaceLayout>
        <LoadingState label="Loading project workspace" rows={5} />
      </WorkspaceLayout>
    );
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Project Overview",
    status: "active",
  };

  return (
    <ProjectLayout
      activeTab="overview"
      layout={WorkspaceLayout}
      project={workspaceProject}
      renderHeader={(content) => <WorkspaceHeader {...content} />}
    >
      {error ? <ErrorState message={error} /> : null}
      {project ? <ProjectWorkspaceOverview project={project} /> : null}
    </ProjectLayout>
  );
}
