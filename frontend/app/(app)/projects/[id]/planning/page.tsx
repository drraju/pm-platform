"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import {
  createPlanningDependency,
  deletePlanningDependency,
  getPlanningWorkspace,
  updatePlanningTaskSchedule,
  type ApiPlanningWorkspace,
} from "@/features/planning";

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
      plannedFinishDate?: string | null;
      plannedStartDate?: string | null;
    },
  ) {
    setError(null);
    setIsSaving(true);
    try {
      await updatePlanningTaskSchedule(projectId, taskId, input);
      await loadWorkspace();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update schedule",
      );
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
    <div className="space-y-6">
      <PageHeader
        description="Plan the project schedule, dependencies, critical path, and resource load without mutating task records directly."
        eyebrow="Enterprise Planning Engine"
        title="Planning Workspace"
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {isLoading ? <PageLoading /> : null}

      {!isLoading && workspace ? (
        <PlanningWorkspace
          isSaving={isSaving}
          onCreateDependency={handleCreateDependency}
          onDeleteDependency={handleDeleteDependency}
          onUpdateSchedule={handleUpdateSchedule}
          workspace={workspace}
        />
      ) : null}
    </div>
  );
}

function PageLoading() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
      <div className="h-[560px] animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
    </div>
  );
}
