"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  WorkspaceLayout,
} from "@/components/foundation";
import { TodayWorkspace } from "@/components/today/today-workspace";
import {
  getAuthMe,
  resolveProjectUiCapabilities,
  storeAuthMe,
} from "@/features/auth";
import {
  getProject,
  getProjectMembers,
  getProjects,
  recordProjectTaskExecutionUpdate,
  type ApiProject,
  type ApiProjectDetails,
} from "@/features/projects";
import { decorateProjectPlan } from "@/features/projects/planning";
import { getTaskExecutionUpdates } from "@/features/tasks";
import { useProjectMembers } from "@/hooks/use-project-members";
import {
  readPersistedWorkspaceState,
  writePersistedWorkspaceState,
} from "@/lib/workspace/persisted-workspace-state";

type TodayPrefs = {
  searchTerm: string;
  selectedProjectId: string;
};

const TODAY_PREFS_KEY = "today";

export default function TodayPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceLayout spacing="compact">
          <LoadingState label="Loading Today" rows={4} />
        </WorkspaceLayout>
      }
    >
      <TodayPageContent />
    </Suspense>
  );
}

function TodayPageContent() {
  const searchParams = useSearchParams();
  const projectIdFromQuery = searchParams.get("projectId")?.trim() ?? "";
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [prefsProjectReady, setPrefsProjectReady] = useState(false);

  useEffect(() => {
    const prefs = readPersistedWorkspaceState<TodayPrefs>(TODAY_PREFS_KEY, {
      searchTerm: "",
      selectedProjectId: "",
    });
    setSearchTerm(prefs.searchTerm);
    setPrefsProjectReady(true);

    let mounted = true;
    Promise.all([getProjects(), getAuthMe()])
      .then(([projectData, authMe]) => {
        if (!mounted) return;
        storeAuthMe(authMe);
        const activeProjects = projectData.filter(
          (candidate) => candidate.status !== "archived",
        );
        setProjects(activeProjects);
        setPermissionKeys(
          authMe.permissions.map((permission) => permission.key),
        );
        setRoles(authMe.roles.map((role) => role.name));
        setCurrentUserId(authMe.user.id);
        const fromQuery = activeProjects.find(
          (candidate) => candidate.id === projectIdFromQuery,
        );
        const persisted = activeProjects.find(
          (candidate) => candidate.id === prefs.selectedProjectId,
        );
        setSelectedProjectId(
          fromQuery?.id ?? persisted?.id ?? activeProjects[0]?.id ?? "",
        );
      })
      .catch((requestError) => {
        if (mounted) {
          setError(getErrorMessage(requestError, "Unable to load Today"));
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectIdFromQuery]);

  useEffect(() => {
    if (!prefsProjectReady) {
      return;
    }
    writePersistedWorkspaceState(TODAY_PREFS_KEY, {
      searchTerm,
      selectedProjectId,
    });
  }, [prefsProjectReady, searchTerm, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      return;
    }

    let mounted = true;
    setIsProjectLoading(true);
    setError(null);
    Promise.all([
      getProject(selectedProjectId),
      getProjectMembers(selectedProjectId).catch(() => []),
    ])
      .then(([projectData, members]) => {
        if (!mounted) return;
        setProject(decorateProjectPlan({ ...projectData, members }));
      })
      .catch((requestError) => {
        if (mounted) {
          setError(
            getErrorMessage(requestError, "Unable to load selected project"),
          );
        }
      })
      .finally(() => {
        if (mounted) setIsProjectLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedProjectId]);

  const {
    error: memberError,
    isLoading: areMembersLoading,
    members,
  } = useProjectMembers(selectedProjectId, project?.members ?? []);

  const capabilities = resolveProjectUiCapabilities({
    currentUserId,
    members,
    permissionKeys,
    project,
    roleNames: roles,
  });

  async function handleExecutionUpdate(
    taskId: string,
    input: Parameters<typeof recordProjectTaskExecutionUpdate>[2],
  ) {
    if (!project) {
      throw new Error("No project selected");
    }
    setIsSaving(true);
    setError(null);
    try {
      const updatedTask = await recordProjectTaskExecutionUpdate(
        project.id,
        taskId,
        input,
      );
      // Patch only the changed task so memoized rows keep stable references.
      setProject((current) =>
        current
          ? {
              ...current,
              tasks: (current.tasks ?? []).map((task) =>
                task.id === taskId ? { ...task, ...updatedTask } : task,
              ),
            }
          : current,
      );
      return updatedTask;
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to save execution update"));
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <WorkspaceLayout spacing="compact">
        <LoadingState label="Loading Today" rows={4} />
      </WorkspaceLayout>
    );
  }

  if (!capabilities.canAccessToday) {
    return (
      <WorkspaceLayout spacing="compact">
        <ErrorState
          message="Today is available to project members with task update access."
          title="Today access required"
        />
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout spacing="compact">
      <h1 className="text-xl font-semibold tracking-tight text-slate-950">
        Today
      </h1>

      {error ? <ErrorState message={error} /> : null}
      {memberError ? <ErrorState message={memberError} /> : null}

      {isProjectLoading || areMembersLoading ? (
        <LoadingState label="Loading project work" rows={5} />
      ) : null}

      {!isProjectLoading && !areMembersLoading && !project ? (
        <EmptyState
          description="Select a project to begin the stand-up."
          title="No project selected"
        />
      ) : null}

      {!isProjectLoading && !areMembersLoading && project ? (
        <TodayWorkspace
          canEdit={capabilities.canManageProjectTasks}
          currentUserId={currentUserId}
          isSaving={isSaving}
          members={members}
          onLoadHistory={getTaskExecutionUpdates}
          onRecordExecutionUpdate={handleExecutionUpdate}
          onSearchTermChange={setSearchTerm}
          onSelectedProjectIdChange={setSelectedProjectId}
          project={project}
          projects={projects}
          searchTerm={searchTerm}
          selectedProjectId={selectedProjectId}
        />
      ) : null}
    </WorkspaceLayout>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
