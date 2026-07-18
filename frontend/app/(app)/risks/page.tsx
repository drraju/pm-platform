"use client";

import React, { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  RaidManagement,
  type RaidMutationInput,
} from "@/components/raid/raid-management";
import {
  getAuthMe,
  getStoredPermissionKeys,
  getStoredSessionUser,
  storeAuthMe,
} from "@/features/auth";
import { getProjects, type ApiProject } from "@/features/projects";
import {
  addRaidComment,
  createRaidItem,
  deleteRaidItem,
  getRaidItems,
  type ApiRaidItem,
  updateRaidItem,
} from "@/features/raid";
import { getRaidPermissions } from "@/features/raid/permissions";
import { getAssignableUsers, type ApiAssignableUser } from "@/features/users";
import {
  createProjectEntityProvider,
  createRaidEntityProvider,
  useEntityProvider,
} from "@/features/entity-search";

export default function RisksPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ApiRaidItem[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiAssignableUser[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const projectEntityProvider = useMemo(
    () => createProjectEntityProvider(projects),
    [projects],
  );
  const raidEntityProvider = useMemo(
    () => createRaidEntityProvider(items),
    [items],
  );
  useEntityProvider(projectEntityProvider);
  useEntityProvider(raidEntityProvider);

  useEffect(() => {
    async function loadRisks() {
      setError(null);
      setIsLoading(true);
      try {
        const [raidItems, projectData, userData, authMe] = await Promise.all([
          getRaidItems(),
          getProjects(),
          getAssignableUsers(),
          getAuthMe(),
        ]);
        storeAuthMe(authMe);
        setItems(raidItems);
        setProjects(projectData);
        setUsers(userData);
        setPermissionKeys(authMe.permissions.map((permission) => permission.key));
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load risks",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadRisks();
  }, []);

  async function handleCreate(input: RaidMutationInput) {
    setIsSaving(true);
    try {
      const item = await createRaidItem({ ...input, type: "risk" });
      setItems((currentItems) => [...currentItems, hydrateItem(item)]);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(
    itemId: string,
    input: Partial<RaidMutationInput>,
  ) {
    setIsSaving(true);
    try {
      const item = await updateRaidItem(itemId, input);
      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === itemId
            ? hydrateItem({ ...currentItem, ...item })
            : currentItem,
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(itemId: string) {
    setIsSaving(true);
    try {
      await deleteRaidItem(itemId);
      setItems((currentItems) =>
        currentItems.filter((currentItem) => currentItem.id !== itemId),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddComment(itemId: string, body: string) {
    setIsSaving(true);
    try {
      const item = await addRaidComment(itemId, { body });
      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === itemId ? hydrateItem({ ...currentItem, ...item }) : currentItem,
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const sessionUser = getStoredSessionUser();
  const permissions = getRaidPermissions(permissionKeys, sessionUser?.userId);
  const projectFilter = searchParams.get("projectId");
  const severityFilter = searchParams.get("severity")?.toLowerCase();
  const statusFilter = searchParams.get("status")?.toLowerCase();
  const visibleItems = items.filter((item) => {
    const matchesProject = projectFilter ? item.projectId === projectFilter : true;
    const matchesSeverity = severityFilter
      ? item.severity?.toLowerCase() === severityFilter
      : true;
    const matchesStatus = statusFilter
      ? statusFilter === "open"
        ? isOpenRaidStatus(item.status)
        : item.status.toLowerCase() === statusFilter
      : true;
    return item.type === "risk" && matchesProject && matchesSeverity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        description="A focused view of risk exposure across active projects."
        eyebrow="RAID register"
        title="Risks"
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <RaidManagement
        emptyMessage="No risks have been created yet."
        fixedType="risk"
        isLoading={isLoading}
        isSaving={isSaving}
        items={visibleItems}
        onAddComment={permissions.canUpdate ? handleAddComment : undefined}
        onCreate={permissions.canCreate ? handleCreate : undefined}
        onDelete={permissions.canDelete ? handleDelete : undefined}
        onUpdate={permissions.canUpdate ? handleUpdate : undefined}
        permissions={permissions}
        projects={projects}
        title="Risks"
        users={users}
      />
    </div>
  );

  function hydrateItem(item: ApiRaidItem) {
    return {
      ...item,
      owner: item.ownerId
        ? toRaidOwner(users.find((user) => user.id === item.ownerId)) ??
          item.owner
        : null,
      project: item.projectId
        ? projects.find((project) => project.id === item.projectId) ?? item.project
        : item.project,
    };
  }
}

function PageLoading() {
  return <div className="space-y-6" />;
}

function toRaidOwner(user: ApiAssignableUser | undefined) {
  return user
    ? {
        email: user.email,
        firstName: user.firstName,
        id: user.id,
        lastName: user.lastName,
        status: user.status ?? "active",
      }
    : undefined;
}

function isOpenRaidStatus(status: string) {
  return !["cancelled", "closed", "complete", "completed", "done", "resolved"].includes(
    status.toLowerCase(),
  );
}
