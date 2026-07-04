"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProjectLayout, ProjectLayoutLoadingState } from "@/components/project";
import { ProjectWorkspaceTasks } from "@/components/projects/project-workspace-tasks";
import {
  getProject,
  getProjectTaskDependencies,
  updateProjectTask,
  type ApiProjectDetails,
  type ApiTaskDependency,
} from "@/features/projects";
import { decorateProjectPlan } from "@/features/projects/planning";
import { useProjectMembers } from "@/hooks/use-project-members";
import type { ApiTask } from "@/lib/api/client";

export default function ProjectTasksPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [project, setProject] = useState<ApiProjectDetails | null>(null);
  const [dependencies, setDependencies] = useState<ApiTaskDependency[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const {
    error: memberError,
    isLoading: areMembersLoading,
    members,
  } = useProjectMembers(projectId, project?.members ?? []);

  useEffect(() => {
    async function loadProject() {
      setError(null);
      setIsLoading(true);
      try {
        const [projectDetails, dependencyData] = await Promise.all([
          getProject(projectId),
          getProjectTaskDependencies(projectId).catch(() => []),
        ]);
        setProject(projectDetails);
        setDependencies(dependencyData);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load project tasks",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  async function handleUpdateTask(
    taskId: string,
    input: {
      actualEndDate?: string | null;
      actualStartDate?: string | null;
      assigneeId?: string | null;
      plannedEndDate?: string | null;
      plannedStartDate?: string | null;
      priority?: string;
      remarks?: string | null;
      percentComplete?: number;
      status?: ApiTask["status"];
      title?: string;
    },
  ) {
    setError(null);
    setIsSaving(true);
    try {
      const updatedTask = await updateProjectTask(projectId, taskId, input);
      setProject((currentProject) => {
        if (!currentProject) {
          return currentProject;
        }
        const nextTasks = (currentProject.tasks ?? []).map((task) =>
          task.id === taskId
            ? {
                ...task,
                ...updatedTask,
                assignee:
                  members.find((member) => member.userId === updatedTask.assigneeId)
                    ?.user ?? updatedTask.assignee,
              }
            : task,
        );
        return decorateProjectPlan({ ...currentProject, tasks: nextTasks });
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update project task",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || areMembersLoading) {
    return <ProjectLayoutLoadingState />;
  }

  const workspaceProject = project ?? {
    id: projectId,
    name: "Project Tasks",
    status: "active",
  };

  return (
    <ProjectLayout activeTab="tasks" project={workspaceProject}>
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
      <ProjectWorkspaceTasks
        dependencies={dependencies}
        canEditTasks
        canReassignTasks
        isSaving={isSaving}
        members={members}
        mode="execution"
        onUpdateTask={handleUpdateTask}
        tasks={project?.tasks ?? []}
      />
    </ProjectLayout>
  );
}
