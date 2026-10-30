"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ErrorState,
  LoadingState,
  WorkspaceHeader,
  WorkspaceLayout,
} from "@/components/foundation";
import { ProjectBoard } from "@/components/board/project-board";
import { CompactProjectWorkspaceLayout, ProjectLayout } from "@/components/project";
import { WorkPanel } from "@/components/work/work-panel";
import { getAuthMe, hasPermission, isExternalContact, storeAuthMe } from "@/features/auth";
import { getProject, type ApiProjectDetails, type ApiTask } from "@/features/projects";
import { addTaskComment, getTaskExecutionUpdates, updateTask } from "@/features/tasks";
import { isWorkContainer, todayDate } from "@/features/work/work-count";

export default function ProjectBoardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLead, setIsLead] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const [details, authMe] = await Promise.all([getProject(projectId), getAuthMe()]);
    storeAuthMe(authMe);
    const userId = authMe.user.id;
    const platformAdmin = authMe.roles.some((role) => role.name === "PLATFORM_ADMIN");
    const lead =
      platformAdmin ||
      (details.members ?? []).some(
        (member) => member.userId === userId && (member.role === "owner" || member.role === "manager"),
      );
    setProject(details);
    setTasks(details.tasks ?? []);
    setCurrentUserId(userId);
    const contact = isExternalContact(authMe.roles);
    const keys = authMe.permissions.map((permission) => permission.key);
    setReadOnly(contact);
    setCanComment(
      !contact &&
        (hasPermission(keys, "task.comment") ||
          hasPermission(keys, "task.update") ||
          hasPermission(keys, "work.update")),
    );
    setIsLead(lead && !contact);
  }, [projectId]);

  useEffect(() => {
    let mounted = true;
    load()
      .catch((requestError: unknown) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "Unable to load the board");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [load]);

  function canMove(task: ApiTask) {
    if (readOnly || isWorkContainer(task, tasks)) return false;
    if (isLead) return true;
    return Boolean(currentUserId && task.assigneeId === currentUserId);
  }

  if (isLoading) {
    return (
      <WorkspaceLayout spacing="compact">
        <LoadingState label="Loading board" rows={4} />
      </WorkspaceLayout>
    );
  }

  const workspaceProject = project ?? { id: projectId, name: "Project", status: "active" };
  const openTask = tasks.find((task) => task.id === openTaskId) ?? null;

  return (
    <ProjectLayout
      activeTab="board"
      layout={CompactProjectWorkspaceLayout}
      project={workspaceProject}
      renderHeader={(content) => <WorkspaceHeader density="compact" {...content} />}
    >
      {error ? <ErrorState message={error} /> : null}
      <ProjectBoard
        canMove={canMove}
        isSaving={isSaving}
        onOpen={(task) => setOpenTaskId(task.id)}
        onMove={async (task, move) => {
          setIsSaving(true);
          setError(null);
          try {
            const saved = await updateTask(task.id, move);
            setTasks((current) => current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to move the card");
          } finally {
            setIsSaving(false);
          }
        }}
        tasks={tasks}
        today={todayDate()}
      />
      {openTask ? (
        <WorkPanel
          canAssign={isLead}
          canComment={canComment && !isWorkContainer(openTask, tasks)}
          canEditTitle={!readOnly && (isLead || openTask.assigneeId === currentUserId)}
          members={project?.members ?? []}
          isSaving={isSaving}
          onClose={() => setOpenTaskId(null)}
          onComment={async (taskId, body) => {
            await addTaskComment(taskId, body);
          }}
          onLoadComments={getTaskExecutionUpdates}
          onUpdate={async (task, patch) => {
            setIsSaving(true);
            setError(null);
            try {
              const saved = await updateTask(task.id, patch);
              setTasks((current) => current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
            } catch (requestError) {
              setError(requestError instanceof Error ? requestError.message : "Unable to update the card");
            } finally {
              setIsSaving(false);
            }
          }}
          task={openTask}
        />
      ) : null}
    </ProjectLayout>
  );
}
