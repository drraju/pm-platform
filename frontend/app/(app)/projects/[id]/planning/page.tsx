"use client";

import React from "react";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import { ProjectLayout, ProjectLayoutLoadingState } from "@/components/project";
import {
  createPlanningDependency,
  createPlanningTask,
  deletePlanningDependency,
  getPlanningWorkspace,
  updatePlanningTaskSchedule,
  type ApiMilestoneCategory,
  type ApiPlanningTaskSchedule,
  type ApiPlanningWorkspace,
  type ApiTaskType,
} from "@/features/planning";
import { useProjectMembers } from "@/hooks/use-project-members";

export default function ProjectPlanningPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [workspace, setWorkspace] = useState<ApiPlanningWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const {
    error: memberError,
    isLoading: areMembersLoading,
    members,
  } = useProjectMembers(projectId, workspace?.project.members ?? []);

  async function loadWorkspace() {
    setError(null);
    setIsLoading(true);
    try {
      setWorkspace(await getPlanningWorkspace(projectId));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load planning workspace",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [projectId]);

  async function handleUpdateSchedule(
    taskId: string,
    input: {
      durationDays?: number | null;
      milestoneCategory?: ApiMilestoneCategory | null;
      ownerId?: string | null;
      parentTaskId?: string | null;
      percentComplete?: number;
      plannedFinishDate?: string | null;
      plannedStartDate?: string | null;
      sequenceNumber?: number | null;
      status?: NonNullable<ApiPlanningTaskSchedule["status"]>;
      taskTitle?: string;
    },
  ): Promise<ApiPlanningTaskSchedule> {
    setError(null);
    setIsSaving(true);
    try {
      const schedule = await updatePlanningTaskSchedule(projectId, taskId, input);
      setWorkspace((currentWorkspace) =>
        currentWorkspace
          ? {
              ...currentWorkspace,
              schedules: currentWorkspace.schedules.map((currentSchedule) =>
                currentSchedule.taskId === schedule.taskId ||
                currentSchedule.id === schedule.id
                  ? schedule
                  : currentSchedule,
              ),
            }
          : currentWorkspace,
      );
      return schedule;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update schedule",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateDependency(input: {
    dependencyType: "FS" | "SS" | "FF";
    predecessorTaskId: string;
    successorTaskId: string;
  }) {
    setError(null);
    setIsSaving(true);
    try {
      await createPlanningDependency(projectId, input);
      await loadWorkspace();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create dependency",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateTask(input: {
    milestoneCategory?: ApiMilestoneCategory;
    parentTaskId?: string | null;
    taskType?: ApiTaskType;
  }): Promise<ApiPlanningTaskSchedule> {
    setError(null);
    setIsSaving(true);
    try {
      const schedule = await createPlanningTask(projectId, input);
      setWorkspace((currentWorkspace) =>
        currentWorkspace
          ? {
              ...currentWorkspace,
              schedules: [...currentWorkspace.schedules, schedule],
            }
          : currentWorkspace,
      );
      return schedule;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create task",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDependency(dependencyId: string) {
    setError(null);
    setIsSaving(true);
    try {
      await deletePlanningDependency(projectId, dependencyId);
      await loadWorkspace();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete dependency",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ProjectLayout
      activeTab="planning"
      project={workspace?.project ?? { id: projectId, name: "Planning Workspace", status: "active" }}
    >
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

      {isLoading || areMembersLoading ? <PageLoading /> : null}

      {!isLoading && !areMembersLoading && workspace ? (
        <PlanningWorkspace
          isSaving={isSaving}
          onCreateDependency={handleCreateDependency}
          onCreateTask={handleCreateTask}
          onDeleteDependency={handleDeleteDependency}
          onUpdateSchedule={handleUpdateSchedule}
          projectMembers={members}
          workspace={workspace}
        />
      ) : null}
    </ProjectLayout>
  );
}

function PageLoading() {
  return <ProjectLayoutLoadingState />;
}
