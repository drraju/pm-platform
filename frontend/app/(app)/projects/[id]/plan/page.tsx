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
import { PlanTimeline } from "@/components/plan/plan-timeline";
import { CompactProjectWorkspaceLayout, ProjectLayout } from "@/components/project";
import { WorkPanel } from "@/components/work/work-panel";
import { getAuthMe, hasPermission, isExternalContact, storeAuthMe } from "@/features/auth";
import {
  createProjectTaskDependency,
  getProject,
  getProjectTaskDependencies,
  type ApiProjectDetails,
  type ApiTask,
  type ApiTaskDependency,
} from "@/features/projects";
import { addTaskComment, createTask, getTaskExecutionUpdates, updateTask } from "@/features/tasks";
import { isWorkContainer, todayDate } from "@/features/work/work-count";
import { reorderPlanSiblings } from "@/features/work/plan-outline";

export default function ProjectPlanPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [dependencies, setDependencies] = useState<ApiTaskDependency[]>([]);
  const [view, setView] = useState<"outline" | "timeline">("outline");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canEditDates, setCanEditDates] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const [details, authMe, links] = await Promise.all([
      getProject(projectId),
      getAuthMe(),
      getProjectTaskDependencies(projectId).catch(() => [] as ApiTaskDependency[]),
    ]);
    storeAuthMe(authMe);
    const userId = authMe.user.id;
    const isPlatformAdmin = authMe.roles.some((role) => role.name === "PLATFORM_ADMIN");
    const isLead =
      isPlatformAdmin ||
      (details.members ?? []).some(
        (member) => member.userId === userId && (member.role === "owner" || member.role === "manager"),
      );
    setProject(details);
    setDependencies(links);
    setTasks(details.tasks ?? []);
    setCurrentUserId(userId);
    const keys = authMe.permissions.map((permission) => permission.key);
    const contact = isExternalContact(authMe.roles);
    setCanEditDates(isLead && !contact);
    setCanComment(
      !contact &&
        (hasPermission(keys, "task.comment") ||
          hasPermission(keys, "task.update") ||
          hasPermission(keys, "work.update")),
    );
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
  const openTask = tasks.find((task) => task.id === openTaskId) ?? null;

  return (
    <ProjectLayout
      activeTab="plan"
      layout={CompactProjectWorkspaceLayout}
      project={workspaceProject}
      renderHeader={(content) => <WorkspaceHeader density="compact" {...content} />}
    >
      {error ? <ErrorState message={error} /> : null}
      <div className="mb-3 flex gap-2">
        <button
          aria-pressed={view === "outline"}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === "outline" ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
          onClick={() => setView("outline")}
          type="button"
        >
          Outline
        </button>
        <button
          aria-pressed={view === "timeline"}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === "timeline" ? "bg-slate-950 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
          onClick={() => setView("timeline")}
          type="button"
        >
          Timeline
        </button>
      </div>
      {view === "timeline" ? (
        <PlanTimeline
          dependencies={dependencies.map((dependency) => ({
            id: dependency.id,
            predecessorTaskId: dependency.predecessorTaskId || dependency.predecessorTask?.id || "",
            successorTaskId: dependency.successorTaskId || dependency.successorTask?.id || "",
          })).filter((dependency) => dependency.predecessorTaskId && dependency.successorTaskId)}
          tasks={tasks}
          today={todayDate()}
        />
      ) : (
      <PlanOutline
        canAdd={canEditDates}
        canEditDates={canEditDates}
        canEditStatus={canEditStatus}
        dependencies={dependencies.map((dependency) => ({
          id: dependency.id,
          predecessorTaskId: dependency.predecessorTaskId || dependency.predecessorTask?.id || "",
          successorTaskId: dependency.successorTaskId || dependency.successorTask?.id || "",
        })).filter((dependency) => dependency.predecessorTaskId && dependency.successorTaskId)}
        isSaving={isSaving}
        onAddDependency={async ({ predecessorTaskId, successorTaskId }) => {
          setIsSaving(true);
          setError(null);
          try {
            await createProjectTaskDependency(projectId, {
              dependencyType: "FS",
              lagDays: 0,
              predecessorTaskId,
              successorTaskId,
            });
            await load();
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to add the dependency");
          } finally {
            setIsSaving(false);
          }
        }}
        members={project?.members ?? []}
        onOpen={(task) => setOpenTaskId(task.id)}
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
      )}
      {openTask ? (
        <WorkPanel
          canAssign={canEditDates}
          canComment={canComment && !isWorkContainer(openTask, tasks)}
          canEditTitle={canEditDates || canEditStatus(openTask)}
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
              setError(requestError instanceof Error ? requestError.message : "Unable to update the plan");
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
