"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ProjectLayout,
  ProjectLayoutLoadingState,
  ProjectWorkspacePlaceholder,
} from "@/components/project";
import { getProject, type ApiProjectDetails } from "@/features/projects";

export default function ProjectDocumentsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProject() {
      try {
        setProject(await getProject(projectId));
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  if (isLoading) {
    return <ProjectLayoutLoadingState />;
  }

  return (
    <ProjectLayout
      activeTab="documents"
      project={project ?? { id: projectId, name: "Project Documents", status: "active" }}
    >
      <ProjectWorkspacePlaceholder
        description="Project document management and Google Drive linking will live here in a future release. Use this tab as the reserved home for project files."
        title="Documents"
      />
    </ProjectLayout>
  );
}
