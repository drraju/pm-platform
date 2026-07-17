"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ProjectLayout,
  ProjectLayoutLoadingState,
} from "@/components/project";
import { ProjectWorkspaceOverview } from "@/components/projects/project-workspace-overview";
import { ErrorState } from "@/components/ui/states";
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
    return <ProjectLayoutLoadingState />;
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Project Overview",
    status: "active",
  };

  return (
    <ProjectLayout activeTab="overview" project={workspaceProject}>
      {error ? (
        <ErrorState variant="page">{error}</ErrorState>
      ) : null}
      {project ? <ProjectWorkspaceOverview project={project} /> : null}
    </ProjectLayout>
  );
}
