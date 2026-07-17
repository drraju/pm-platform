"use client";

import React from "react";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import { ProjectLayout, ProjectLayoutLoadingState } from "@/components/project";
import {
  createPlanningDependency,
  createPlanningTask,
  duplicatePlanningWorkPackage,
  deletePlanningDependency,
  getPlanningWorkspace,
  regeneratePlanningWorkspace,
  removeDuplicatedPlanningWorkPackage,
  updatePlanningTaskSchedule,
  type ApiMilestoneCategory,
  type ApiDuplicateWorkPackageInput,
  type ApiDuplicateWorkPackageResult,
  type ApiPlanningTaskSchedule,
  type ApiPlanningWorkspace,
  type ApiTaskType,
} from "@/features/planning";
import { deleteProjectTask } from "@/lib/api/client";
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
      const schedule = await updatePlanningTaskSchedule(
        projectId,
        taskId,
        input,
      );
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

  async function handleDuplicateWorkPackage(
    sourceSummaryTaskId: string,
    input: ApiDuplicateWorkPackageInput,
  ): Promise<ApiDuplicateWorkPackageResult> {
    setError(null);
    setIsSaving(true);
    try {
      const result = await duplicatePlanningWorkPackage(
        projectId,
        sourceSummaryTaskId,
        input,
      );
      setWorkspace(result.workspace);
      return result;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to duplicate work package",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveDuplicatedWorkPackage(
    summaryTaskId: string,
  ): Promise<ApiPlanningWorkspace> {
    setError(null);
    setIsSaving(true);
    try {
      const nextWorkspace = await removeDuplicatedPlanningWorkPackage(
        projectId,
        summaryTaskId,
      );
      setWorkspace(nextWorkspace);
      return nextWorkspace;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to undo duplicate work package",
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

  async function handleRegenerateWorkspace() {
    setError(null);
    setIsLoading(true);
    setIsSaving(true);
    try {
      setWorkspace(await regeneratePlanningWorkspace(projectId));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to regenerate planning workspace",
      );
    } finally {
      setIsSaving(false);
      setIsLoading(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    setError(null);
    setIsSaving(true);
    try {
      await deleteProjectTask(projectId, taskId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete task",
      );
      throw requestError;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ProjectLayout
      activeTab="planning"
      project={
        workspace?.project ?? {
          id: projectId,
          name: "Planning Workspace",
          status: "active",
        }
      }
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
          onDeleteTask={handleDeleteTask}
          isSaving={isSaving}
          onCreateDependency={handleCreateDependency}
          onCreateTask={handleCreateTask}
          onDeleteDependency={handleDeleteDependency}
          onDuplicateWorkPackage={handleDuplicateWorkPackage}
          onRefreshWorkspace={loadWorkspace}
          onRegenerateWorkspace={handleRegenerateWorkspace}
          onRemoveDuplicatedWorkPackage={handleRemoveDuplicatedWorkPackage}
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
