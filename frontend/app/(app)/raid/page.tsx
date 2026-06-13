"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  RaidManagement,
  type RaidMutationInput,
} from "@/components/raid/raid-management";
import {
  getAuthMe,
  getStoredPermissionKeys,
  getStoredSessionUser,
  hasPermission,
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

export default function RaidPage() {
  const [items, setItems] = useState<ApiRaidItem[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiAssignableUser[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [raidData, projectData, userData, authMe] = await Promise.all([
        getRaidItems(),
        getProjects(),
        getAssignableUsers(),
        getAuthMe(),
      ]);
      storeAuthMe(authMe);
      setItems(raidData);
      setProjects(projectData);
      setUsers(userData);
      setPermissionKeys(authMe.permissions.map((permission) => permission.key));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load RAID",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreate(input: RaidMutationInput) {
    setIsSaving(true);
    try {
      const item = await createRaidItem(input);
      setItems((currentItems) => [...currentItems, hydrateRaidItem(item)]);
      showToast(setToast, "success", "RAID item created.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to create RAID item.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create RAID item",
      );
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
            ? hydrateRaidItem({ ...currentItem, ...item })
            : currentItem,
        ),
      );
      showToast(setToast, "success", "RAID item updated.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to update RAID item.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update RAID item",
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
      showToast(setToast, "success", "RAID item deleted.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to delete RAID item.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete RAID item",
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
          currentItem.id === itemId ? hydrateRaidItem({ ...currentItem, ...item }) : currentItem,
        ),
      );
      showToast(setToast, "success", "RAID comment added.");
    } catch (requestError) {
      showToast(setToast, "error", "Unable to add RAID comment.");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add RAID comment",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const sessionUser = getStoredSessionUser();
  const permissions = getRaidPermissions(permissionKeys, sessionUser?.userId);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Capture risks, assumptions, issues, and dependencies with ownership, status, and escalation context."
        eyebrow="RAID register"
        title="RAID"
      />

      {error ? <ErrorMessage message={error} /> : null}
      {toast ? <ToastMessage toast={toast} /> : null}

      <RaidManagement
        emptyMessage="No RAID items have been created yet."
        isLoading={isLoading}
        isSaving={isSaving}
        items={items}
        onAddComment={permissions.canUpdate ? handleAddComment : undefined}
        onCreate={permissions.canCreate ? handleCreate : undefined}
        onDelete={permissions.canDelete ? handleDelete : undefined}
        onUpdate={permissions.canUpdate ? handleUpdate : undefined}
        permissions={permissions}
        projects={projects}
        title="RAID Items"
        users={users}
      />
    </div>
  );

  function hydrateRaidItem(item: ApiRaidItem) {
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

type ToastState = {
  id: number;
  message: string;
  tone: "error" | "success";
};

function showToast(
  setToast: React.Dispatch<React.SetStateAction<ToastState | null>>,
  tone: ToastState["tone"],
  message: string,
) {
  const id = Date.now();
  setToast({ id, message, tone });
  window.setTimeout(() => {
    setToast((currentToast) => (currentToast?.id === id ? null : currentToast));
  }, 3000);
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </section>
  );
}

function ToastMessage({ toast }: { toast: ToastState }) {
  return (
    <section
      className={`fixed right-4 top-4 z-50 rounded-md border px-4 py-3 text-sm font-semibold shadow-lg ${
        toast.tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
      role="status"
    >
      {toast.message}
    </section>
  );
}
