"use client";

import React from "react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ErrorState,
  LoadingState,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceLayout,
} from "@/components/foundation";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import { ForecastStatus } from "@/components/planning/forecast-status";
import {
  CompactProjectWorkspaceLayout,
  ProjectLayout,
} from "@/components/project";
import {
  createPlanningDependency,
  createPlanningTask,
  duplicatePlanningWorkPackage,
  deletePlanningDependency,
  getLatestPlanningSchedule,
  getPlanningWorkspace,
  getProjectBaseline,
  getProjectForecastOverview,
  removeDuplicatedPlanningWorkPackage,
  updatePlanningTaskSchedule,
  type ApiMilestoneCategory,
  type ApiDuplicateWorkPackageInput,
  type ApiDuplicateWorkPackageResult,
  type ApiPlanningTaskSchedule,
  type ApiPlanningScheduleSnapshot,
  type ApiPlanningWorkspace,
  type ApiProjectBaseline,
  type ApiTaskType,
} from "@/features/planning";
import { deleteProjectTask } from "@/lib/api/client";
import { useProjectMembers } from "@/hooks/use-project-members";

export default function ProjectPlanningPage() {
  return (
    <Suspense fallback={<PageLoading standalone />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [workspace, setWorkspace] = useState<ApiPlanningWorkspace | null>(null);
  const [currentForecast, setCurrentForecast] =
    useState<ApiPlanningScheduleSnapshot | null>(null);
  const [activeBaseline, setActiveBaseline] =
    useState<ApiProjectBaseline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const {
    error: memberError,
    isLoading: areMembersLoading,
    members,
  } = useProjectMembers(projectId, workspace?.project.members ?? []);

  const loadWorkspace = useCallback(async () => {
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
  }, [projectId]);

  const loadTrackingReferences = useCallback(async () => {
    setTrackingError(null);
    try {
      const overview = await getProjectForecastOverview(projectId);
      const currentForecastSummary = overview.currentForecast;
      const activeBaselineSummary = overview.activeBaseline;
      const [forecastResult, baselineResult] = await Promise.allSettled([
        currentForecastSummary
          ? getLatestPlanningSchedule(projectId).then((latestSchedule) => {
              if (
                !latestSchedule ||
                latestSchedule.id !== currentForecastSummary.snapshotId
              ) {
                throw new Error(
                  "Current Forecast task rows do not match the authoritative Forecast snapshot",
                );
              }
              return latestSchedule;
            })
          : Promise.resolve(null),
        activeBaselineSummary
          ? getProjectBaseline(projectId, activeBaselineSummary.id).then(
              (baseline) => {
                if (
                  activeBaselineSummary.status !== "approved" ||
                  baseline.status !== "approved" ||
                  !baseline.isCurrent
                ) {
                  throw new Error(
                    "Active Baseline detail does not match the authoritative baseline state",
                  );
                }
                return baseline;
              },
            )
          : Promise.resolve(null),
      ]);

      setCurrentForecast(
        forecastResult.status === "fulfilled" ? forecastResult.value : null,
      );
      setActiveBaseline(
        baselineResult.status === "fulfilled" ? baselineResult.value : null,
      );

      const failures = [forecastResult, baselineResult].filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failures.length > 0) {
        setTrackingError(
          failures
            .map(({ reason }) =>
              reason instanceof Error
                ? reason.message
                : "Unable to load a Tracking reference",
            )
            .join(" "),
        );
      }
    } catch (requestError) {
      setCurrentForecast(null);
      setActiveBaseline(null);
      setTrackingError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load Tracking references",
      );
    }
  }, [projectId]);

  useEffect(() => {
    void loadWorkspace();
    void loadTrackingReferences();
  }, [loadTrackingReferences, loadWorkspace]);

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
      await loadWorkspace();
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
    ownerId?: string | null;
    parentTaskId?: string | null;
    taskType?: ApiTaskType;
    title?: string;
  }): Promise<ApiPlanningTaskSchedule> {
    setError(null);
    setIsSaving(true);
    try {
      const schedule = await createPlanningTask(projectId, input);
      await loadWorkspace();
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

  async function handleDeleteTask(taskId: string) {
    setError(null);
    setIsSaving(true);
    try {
      await deleteProjectTask(projectId, taskId);
      await loadWorkspace();
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
      layout={CompactProjectWorkspaceLayout}
      project={
        workspace?.project ?? {
          id: projectId,
          name: "Planning Workspace",
          status: "active",
        }
      }
      renderHeader={(content) => (
        <WorkspaceHeader density="compact" {...content} />
      )}
    >
      <WorkspaceContent spacing="compact">
        <ForecastStatus
          onWorkspaceRefresh={async () => {
            await Promise.all([loadWorkspace(), loadTrackingReferences()]);
          }}
          projectId={projectId}
        />

        {error ? <ErrorState message={error} /> : null}
        {trackingError ? <ErrorState message={trackingError} /> : null}
        {memberError ? <ErrorState message={memberError} /> : null}

        {isLoading || areMembersLoading ? <PageLoading /> : null}

        {!isLoading && !areMembersLoading && workspace ? (
          <PlanningWorkspace
            activeBaseline={activeBaseline}
            currentForecast={currentForecast}
            onDeleteTask={handleDeleteTask}
            isSaving={isSaving}
            onCreateDependency={handleCreateDependency}
            onCreateTask={handleCreateTask}
            onDeleteDependency={handleDeleteDependency}
            onDuplicateWorkPackage={handleDuplicateWorkPackage}
            onRefreshWorkspace={loadWorkspace}
            onRemoveDuplicatedWorkPackage={handleRemoveDuplicatedWorkPackage}
            onUpdateSchedule={handleUpdateSchedule}
            projectMembers={members}
            workspace={workspace}
          />
        ) : null}
      </WorkspaceContent>
    </ProjectLayout>
  );
}

function PageLoading({ standalone = false }: { standalone?: boolean }) {
  const loadingState = (
    <LoadingState
      className="rounded-ui border border-ui-border bg-ui-surface p-5 shadow-ui-subtle"
      label="Loading planning workspace"
      rows={6}
    />
  );

  return standalone ? (
    <WorkspaceLayout>{loadingState}</WorkspaceLayout>
  ) : (
    loadingState
  );
}
