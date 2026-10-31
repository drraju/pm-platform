"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TodayList } from "@/components/today/today-list";
import { getAuthMe, storeAuthMe } from "@/features/auth";
import { getProject, getProjects, type ApiProject, type ApiProjectMember, type ApiTask } from "@/features/projects";
import {
  addTaskComment,
  createTask,
  getMyTasks,
  getTaskExecutionUpdates,
  updateTask,
} from "@/features/tasks";
import { countWork, isWorkContainer, todayDate, workLeaves } from "@/features/work/work-count";

export default function TodayPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading Today...</p>}>
      <TodayPageContent />
    </Suspense>
  );
}

function TodayPageContent() {
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get("projectId")?.trim() ?? "";
  const requestedWorkId = searchParams.get("work")?.trim() ?? "";
  const [scope, setScope] = useState(requestedProjectId || "mine");
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [members, setMembers] = useState<ApiProjectMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const today = todayDate();

  const load = useCallback(async (nextScope: string, userId: string | null) => {
    if (nextScope === "mine") {
      const mine = await getMyTasks();
      setMembers([]);
      setTasks(mine.filter((task) => !userId || task.assigneeId === userId || isWorkContainer(task, mine)));
      return;
    }
    const project = await getProject(nextScope);
    setMembers(project.members ?? []);
    setTasks(
      (project.tasks ?? []).map((task) => ({
        ...task,
        project: task.project ?? {
          id: project.id,
          name: project.name,
          customer: project.customer,
          status: project.status,
        },
      })),
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([getProjects(), getAuthMe()])
      .then(async ([projectData, authMe]) => {
        if (!mounted) return;
        storeAuthMe(authMe);
        const active = projectData.filter((project) => project.status !== "archived");
        setProjects(active);
        const userId = authMe.user.id;
        setCurrentUserId(userId);
        setIsPlatformAdmin(authMe.roles.some((role) => role.name === "PLATFORM_ADMIN"));
        const initial = requestedProjectId && active.some((project) => project.id === requestedProjectId)
          ? requestedProjectId
          : "mine";
        setScope(initial);
        await load(initial, userId);
      })
      .catch((requestError: unknown) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "Unable to load Today");
      });
    return () => {
      mounted = false;
    };
  }, [load, requestedProjectId]);

  const leaves = useMemo(() => workLeaves(tasks), [tasks]);
  const rows = useMemo(
    () => (scope === "mine" ? leaves.filter((task) => task.assigneeId === currentUserId) : leaves),
    [currentUserId, leaves, scope],
  );
  const containers = useMemo(
    () => tasks.filter((task) => isWorkContainer(task, tasks)),
    [tasks],
  );
  const count = useMemo(
    () => countWork(scope === "mine" ? rows : tasks, today),
    [rows, scope, tasks, today],
  );
  const isLead = members.some(
    (member) => member.userId === currentUserId && (member.role === "owner" || member.role === "manager"),
  );

  function canEdit(task: ApiTask) {
    if (isWorkContainer(task, tasks)) return false;
    if (isPlatformAdmin || isLead) return true;
    return Boolean(currentUserId && task.assigneeId === currentUserId);
  }

  async function refresh() {
    await load(scope, currentUserId);
  }

  return (
    <TodayList
      canAdd={isPlatformAdmin || isLead}
      canAssign={isPlatformAdmin || isLead}
      canEdit={canEdit}
      containers={scope === "mine" ? [] : containers}
      count={count}
      error={error}
      isSaving={isSaving}
      members={members}
      onAdd={async (input) => {
        setIsSaving(true);
        setError(null);
        try {
          await createTask({ ...input, assigneeId: currentUserId ?? undefined, status: "todo" });
          if (scope === "mine") setScope(input.projectId);
          await load(input.projectId, currentUserId);
          if (scope === "mine") setScope(input.projectId);
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Unable to add work");
        } finally {
          setIsSaving(false);
        }
      }}
      onAddSubtask={async ({ parentTaskId, title }) => {
        if (scope === "mine") return;
        setIsSaving(true);
        setError(null);
        try {
          await createTask({ parentTaskId, projectId: scope, status: "todo", title });
          await load(scope, currentUserId);
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Unable to add the subtask");
        } finally {
          setIsSaving(false);
        }
      }}
      onComment={async (taskId, body) => {
        await addTaskComment(taskId, body);
      }}
      onLoadComments={getTaskExecutionUpdates}
      openTaskId={requestedWorkId || null}
      onScopeChange={(nextScope) => {
        setScope(nextScope);
        setError(null);
        void load(nextScope, currentUserId).catch((requestError: unknown) => {
          setError(requestError instanceof Error ? requestError.message : "Unable to load Today");
        });
      }}
      onUpdate={async (task, patch) => {
        setIsSaving(true);
        setError(null);
        try {
          const saved = await updateTask(task.id, patch);
          setTasks((current) =>
            current.map((item) => {
              if (item.id !== saved.id) return item;
              const next = { ...item, ...saved, assignee: saved.assignee ?? item.assignee };
              if (patch.assigneeId !== undefined) {
                const member = members.find((entry) => entry.userId === patch.assigneeId);
                next.assigneeId = patch.assigneeId;
                next.assignee = member?.user
                  ? { ...member.user, id: member.user.id ?? member.userId }
                  : patch.assigneeId
                    ? next.assignee
                    : null;
              }
              return next;
            }),
          );
          if (patch.status === "done" || patch.dueDate !== undefined) await refresh();
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Unable to update work");
        } finally {
          setIsSaving(false);
        }
      }}
      projects={projects}
      rows={rows}
      scope={scope}
      tasks={scope === "mine" ? rows : tasks}
    />
  );
}
