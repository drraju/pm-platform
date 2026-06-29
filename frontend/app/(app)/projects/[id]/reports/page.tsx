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

export default function ProjectReportsPage() {
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
      activeTab="reports"
      project={project ?? { id: projectId, name: "Project Reports", status: "active" }}
    >
      <ProjectWorkspacePlaceholder title="Reports" />
    </ProjectLayout>
  );
}
