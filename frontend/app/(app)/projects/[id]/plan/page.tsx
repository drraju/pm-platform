"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ErrorState,
  LoadingState,
  WorkspaceHeader,
  WorkspaceLayout,
} from "@/components/foundation";
import { PlanOutline } from "@/components/plan/plan-outline";
import { CompactProjectWorkspaceLayout, ProjectLayout } from "@/components/project";
import { getAuthMe, isExternalContact, storeAuthMe } from "@/features/auth";
import { getProject, type ApiProjectDetails, type ApiTask } from "@/features/projects";
import { createTask, updateTask } from "@/features/tasks";
import { isWorkContainer, todayDate } from "@/features/work/work-count";
import { reorderPlanSiblings } from "@/features/work/plan-outline";

export default function ProjectPlanPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canEditDates, setCanEditDates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const [details, authMe] = await Promise.all([getProject(projectId), getAuthMe()]);
    storeAuthMe(authMe);
    const userId = authMe.user.id;
    const isPlatformAdmin = authMe.roles.some((role) => role.name === "PLATFORM_ADMIN");
    const isLead =
      isPlatformAdmin ||
      (details.members ?? []).some(
        (member) => member.userId === userId && (member.role === "owner" || member.role === "manager"),
      );
    setProject(details);
    setTasks(details.tasks ?? []);
    setCurrentUserId(userId);
    setCanEditDates(isLead && !isExternalContact(authMe.roles));
  }, [projectId]);

  useEffect(() => {
    let mounted = true;
    load()
      .catch((requestError: unknown) => {
        if (mounted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load the plan");
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [load]);

  function canEditStatus(task: ApiTask) {
    if (isWorkContainer(task, tasks)) return false;
    if (canEditDates) return true;
    return Boolean(currentUserId && task.assigneeId === currentUserId);
  }

  if (isLoading) {
    return (
      <WorkspaceLayout spacing="compact">
        <LoadingState label="Loading plan" rows={4} />
      </WorkspaceLayout>
    );
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Project",
    status: "active",
  };

  return (
    <ProjectLayout
      activeTab="plan"
      layout={CompactProjectWorkspaceLayout}
      project={workspaceProject}
      renderHeader={(content) => <WorkspaceHeader density="compact" {...content} />}
    >
      {error ? <ErrorState message={error} /> : null}
      <PlanOutline
        canAdd={canEditDates}
        canEditDates={canEditDates}
        canEditStatus={canEditStatus}
        isSaving={isSaving}
        members={project?.members ?? []}
        onAdd={async (input) => {
          setIsSaving(true);
          setError(null);
          try {
            await createTask({
              parentTaskId: input.parentTaskId,
              projectId,
              status: "todo",
              title: input.title,
            });
            await load();
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to add work");
          } finally {
            setIsSaving(false);
          }
        }}
        onReorder={async (draggedId, targetId) => {
          const changes = reorderPlanSiblings(tasks, draggedId, targetId);
          if (changes.length === 0) return;
          setIsSaving(true);
          setError(null);
          try {
            await Promise.all(changes.map((change) => updateTask(change.id, { sequenceNumber: change.sequenceNumber })));
            setTasks((current) =>
              current.map((task) => {
                const change = changes.find((item) => item.id === task.id);
                return change ? { ...task, sequenceNumber: change.sequenceNumber } : task;
              }),
            );
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to reorder work");
          } finally {
            setIsSaving(false);
          }
        }}
        onUpdate={async (task, patch) => {
          setIsSaving(true);
          setError(null);
          try {
            const saved = await updateTask(task.id, patch);
            setTasks((current) => current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to update the plan");
          } finally {
            setIsSaving(false);
          }
        }}
        tasks={tasks}
        today={todayDate()}
      />
    </ProjectLayout>
  );
}
