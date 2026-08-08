"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ErrorState,
  LoadingState,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceLayout,
} from "@/components/foundation";
import {
  CompactProjectWorkspaceLayout,
  ProjectLayout,
} from "@/components/project";
import {
  RaidManagement,
  type RaidMutationInput,
} from "@/components/raid/raid-management";
import { getProject, type ApiProjectDetails } from "@/features/projects";
import {
  addRaidComment,
  createRaidItem,
  deleteRaidItem,
  updateRaidItem,
} from "@/features/raid";
import { useProjectMembers } from "@/hooks/use-project-members";
import type { ApiRaidItem } from "@/lib/api/client";
import {
  createProjectEntityProvider,
  createRaidEntityProvider,
  useEntityProvider,
} from "@/features/entity-search";

/**
 * Govern workspace — Risks, Issues, Assumptions, Dependencies today.
 * Architecture prepared for future Change Requests / Approvals.
 * Reuses existing RAID APIs and RaidManagement (no duplicate editor).
 */
export default function ProjectGovernPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const {
    error: memberError,
    isLoading: areMembersLoading,
    members,
    memberUsers,
  } = useProjectMembers(projectId, project?.members ?? []);

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
            : "Unable to load Govern workspace",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  async function handleCreateRaidItem(input: RaidMutationInput) {
    setError(null);
    setIsSaving(true);
    try {
      const item = await createRaidItem({ ...input, projectId });
      setProject((currentProject) =>
        currentProject ? appendRaidItem(currentProject, item) : currentProject,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create RAID item",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateRaidItem(
    itemId: string,
    input: Partial<RaidMutationInput>,
  ) {
    setError(null);
    setIsSaving(true);
    try {
      const item = await updateRaidItem(itemId, input);
      setProject((currentProject) =>
        currentProject ? replaceRaidItem(currentProject, item) : currentProject,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update RAID item",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRaidItem(itemId: string) {
    setError(null);
    setIsSaving(true);
    try {
      await deleteRaidItem(itemId);
      setProject((currentProject) =>
        currentProject ? removeRaidItem(currentProject, itemId) : currentProject,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete RAID item",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddRaidComment(itemId: string, body: string) {
    setError(null);
    setIsSaving(true);
    try {
      const item = await addRaidComment(itemId, { body });
      setProject((currentProject) =>
        currentProject ? replaceRaidItem(currentProject, item) : currentProject,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add RAID comment",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  const raidItems = useMemo<ApiRaidItem[]>(() => {
    if (!project) {
      return [];
    }

    return [
      ...(project.risks ?? []),
      ...(project.issues ?? []),
      ...(project.assumptions ?? []),
      ...(project.dependencies ?? []),
    ];
  }, [project]);
  const projectEntityProvider = useMemo(
    () => createProjectEntityProvider(project ? [project] : []),
    [project],
  );
  const raidEntityProvider = useMemo(
    () => createRaidEntityProvider(raidItems),
    [raidItems],
  );
  useEntityProvider(projectEntityProvider);
  useEntityProvider(raidEntityProvider);

  if (isLoading || areMembersLoading) {
    return (
      <WorkspaceLayout spacing="compact">
        <LoadingState
          className="rounded-ui border border-ui-border bg-ui-surface p-5 shadow-ui-subtle"
          label="Loading Govern workspace"
          rows={6}
        />
      </WorkspaceLayout>
    );
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Govern",
    status: "active",
  };

  return (
    <ProjectLayout
      activeTab="govern"
      layout={CompactProjectWorkspaceLayout}
      project={workspaceProject}
      renderHeader={(content) => (
        <WorkspaceHeader density="compact" {...content} />
      )}
    >
      <WorkspaceContent spacing="compact">
        {error ? <ErrorState message={error} /> : null}
        {memberError ? <ErrorState message={memberError} /> : null}
        <RaidManagement
          emptyMessage="No governance items have been added for this project."
          fixedProjectId={projectId}
          isSaving={isSaving}
          items={raidItems}
          onAddComment={handleAddRaidComment}
          onCreate={handleCreateRaidItem}
          onDelete={handleDeleteRaidItem}
          onUpdate={handleUpdateRaidItem}
          permissions={{ canCreate: true, canDelete: true, canUpdate: true }}
          projectMembers={members}
          projects={project ? [project] : []}
          title="Govern"
          users={memberUsers}
        />
      </WorkspaceContent>
    </ProjectLayout>
  );
}

function appendRaidItem(project: ApiProjectDetails, item: ApiRaidItem) {
  const key = getRaidCollectionKey(item.type);
  return {
    ...project,
    [key]: [...(project[key] ?? []), item],
  };
}

function replaceRaidItem(project: ApiProjectDetails, item: ApiRaidItem) {
  const key = getRaidCollectionKey(item.type);
  return {
    ...project,
    [key]: (project[key] ?? []).map((currentItem) =>
      currentItem.id === item.id ? { ...currentItem, ...item } : currentItem,
    ),
  };
}

function removeRaidItem(project: ApiProjectDetails, itemId: string) {
  return {
    ...project,
    assumptions: (project.assumptions ?? []).filter((item) => item.id !== itemId),
    dependencies: (project.dependencies ?? []).filter((item) => item.id !== itemId),
    issues: (project.issues ?? []).filter((item) => item.id !== itemId),
    risks: (project.risks ?? []).filter((item) => item.id !== itemId),
  };
}

function getRaidCollectionKey(type: ApiRaidItem["type"]) {
  switch (type) {
    case "risk":
      return "risks";
    case "issue":
      return "issues";
    case "assumption":
      return "assumptions";
    case "dependency":
      return "dependencies";
  }
}
