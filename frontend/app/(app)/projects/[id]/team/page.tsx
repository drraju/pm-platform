"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProjectLayout, ProjectLayoutLoadingState } from "@/components/project";
import { ProjectWorkspaceTeam } from "@/components/projects/project-workspace-team";
import {
  getAssignableUsers,
  getProject,
  type ApiAssignableUser,
  type ApiProjectDetails,
} from "@/features/projects";
import { useProjectMembers } from "@/hooks/use-project-members";

export default function ProjectTeamPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [users, setUsers] = useState<ApiAssignableUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const {
    addMember,
    error: memberError,
    isLoading: areMembersLoading,
    isSaving,
    members,
    removeMember,
    updateMember,
  } = useProjectMembers(projectId, project?.members ?? []);

  useEffect(() => {
    async function loadProject() {
      setError(null);
      setIsLoading(true);
      try {
        const [projectDetails, assignableUsers] = await Promise.all([
          getProject(projectId),
          getAssignableUsers(),
        ]);
        setProject(projectDetails);
        setUsers(assignableUsers);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load project team",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  if (isLoading || areMembersLoading) {
    return <ProjectLayoutLoadingState />;
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Project Team",
    status: "active",
  };

  return (
    <ProjectLayout activeTab="resources" project={workspaceProject}>
      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}
      {memberError ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {memberError}
        </section>
      ) : null}
      <ProjectWorkspaceTeam
        availableUsers={users}
        isSaving={isSaving}
        members={members}
        onAddMember={addMember}
        onRemoveMember={removeMember}
        onUpdateMember={updateMember}
      />
    </ProjectLayout>
  );
}
