"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ErrorState,
  LoadingState,
  WorkspaceHeader,
  WorkspaceLayout,
} from "@/components/foundation";
import { CompactProjectWorkspaceLayout, ProjectLayout } from "@/components/project";
import {
  ProjectRaidRegister,
  defaultStatus,
  type RaidDraft,
} from "@/components/projects/project-raid-register";
import { getAuthMe, hasPermission, storeAuthMe } from "@/features/auth";
import { getProject, type ApiProjectDetails } from "@/features/projects";
import { createRaidItem, updateRaidItem } from "@/features/raid";
import type { ApiRaidItem } from "@/lib/api/client";

function registerItems(project: ApiProjectDetails): ApiRaidItem[] {
  return [
    ...(project.risks ?? []),
    ...(project.issues ?? []),
    ...(project.assumptions ?? []),
    ...(project.dependencies ?? []),
  ];
}

export default function ProjectRaidPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [items, setItems] = useState<ApiRaidItem[]>([]);
  const [canRead, setCanRead] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const [details, authMe] = await Promise.all([
      getProject(projectId),
      getAuthMe(),
    ]);
    storeAuthMe(authMe);
    const permissionKeys = authMe.permissions.map((permission) => permission.key);
    const allowed = hasPermission(permissionKeys, "raid.read");
    setCanRead(allowed);
    setCanAdd(hasPermission(permissionKeys, "raid.create"));
    setCanUpdate(hasPermission(permissionKeys, "raid.update"));
    setProject(details);
    setItems(allowed ? registerItems(details) : []);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    async function run() {
      setError(null);
      setIsLoading(true);
      try {
        await load();
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load RAID",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, [load]);

  async function handleCreate(draft: RaidDraft) {
    setError(null);
    setIsSaving(true);
    try {
      const created = await createRaidItem({
        description: draft.description.trim() || undefined,
        dueDate: draft.dueDate || undefined,
        ownerId: draft.ownerId || undefined,
        projectId,
        status: defaultStatus[draft.type],
        title: draft.title,
        type: draft.type,
      });
      setItems((current) => [...current, created]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add this record",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(itemId: string, status: string) {
    setError(null);
    const previous = items;
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, status } : item)),
    );
    try {
      await updateRaidItem(itemId, { status });
    } catch (requestError) {
      setItems(previous);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update this record",
      );
    }
  }

  if (isLoading) {
    return (
      <WorkspaceLayout spacing="compact">
        <LoadingState label="Opening RAID" rows={3} />
      </WorkspaceLayout>
    );
  }

  if (error && !project) {
    return (
      <WorkspaceLayout spacing="compact">
        <ErrorState title="Something went wrong" message={error} />
      </WorkspaceLayout>
    );
  }

  if (!project || !canRead) {
    return (
      <WorkspaceLayout spacing="compact">
        <WorkspaceHeader title="RAID" subtitle="Not available for this account." />
      </WorkspaceLayout>
    );
  }

  return (
    <ProjectLayout
      activeTab="raid"
      layout={CompactProjectWorkspaceLayout}
      project={project}
    >
      <WorkspaceHeader
        title="RAID"
        subtitle="Risks, issues, assumptions, and dependencies for this project."
      />
      {error ? (
        <ErrorState title="Something went wrong" message={error} />
      ) : null}
      <ProjectRaidRegister
        canAdd={canAdd}
        canUpdate={canUpdate}
        isSaving={isSaving}
        items={items}
        members={project.members ?? []}
        onCreate={handleCreate}
        onStatusChange={handleStatusChange}
      />
    </ProjectLayout>
  );
}
