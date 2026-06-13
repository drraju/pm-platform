"use client";

import React from "react";
import { FormEvent, useMemo, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import {
  ModalForm,
  ModalFormGrid,
  ModalFormSection,
} from "@/components/ui/modal-form";
import type {
  ApiAssignableUser,
  ApiProject,
  ApiRaidItem,
} from "@/lib/api/client";

export type RaidType = ApiRaidItem["type"];

export type RaidPermissions = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  currentUserId?: string;
};

type RaidManagementProps = {
  emptyMessage: string;
  fixedProjectId?: string;
  fixedType?: RaidType;
  isLoading?: boolean;
  isSaving?: boolean;
  items: ApiRaidItem[];
  onAddComment?: (itemId: string, body: string) => Promise<void> | void;
  onCreate?: (input: RaidMutationInput) => Promise<void> | void;
  onDelete?: (itemId: string) => Promise<void> | void;
  onUpdate?: (
    itemId: string,
    input: Partial<RaidMutationInput>,
  ) => Promise<void> | void;
  permissions: RaidPermissions;
  projects: ApiProject[];
  title: string;
  users: ApiAssignableUser[];
};

export type RaidMutationInput = {
  type: RaidType;
  projectId: string;
  title: string;
  description?: string;
  ownerId?: string;
  status?: string;
  severity?: string;
  probability?: string;
  impact?: string;
  mitigationPlan?: string;
  resolutionPlan?: string;
  validationStatus?: string;
  validationNotes?: string;
  dependsOn?: string;
  dueDate?: string;
};

const raidTypes: RaidType[] = ["risk", "issue", "assumption", "dependency"];
const levelOptions = ["low", "medium", "high", "critical"];
const riskStatuses = ["open", "monitoring", "mitigating", "closed"];
const issueStatuses = ["open", "in_progress", "blocked", "resolved", "closed"];
const assumptionStatuses = ["active", "validated", "invalidated", "closed"];
const dependencyStatuses = ["pending", "in_progress", "blocked", "met"];
const validationStatuses = ["unvalidated", "validating", "validated", "invalidated"];

export function RaidManagement({
  emptyMessage,
  fixedProjectId,
  fixedType,
  isLoading = false,
  isSaving = false,
  items,
  onAddComment,
  onCreate,
  onDelete,
  onUpdate,
  permissions,
  projects,
  title,
  users,
}: RaidManagementProps) {
  const [editingItem, setEditingItem] = useState<ApiRaidItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ApiRaidItem | null>(null);
  const canCreate = permissions.canCreate && Boolean(onCreate);

  const visibleItems = useMemo(
    () => (fixedType ? items.filter((item) => item.type === fixedType) : items),
    [fixedType, items],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = formDataToRaidInput(formData, fixedType, fixedProjectId);

    if (editingItem && onUpdate) {
      await onUpdate(editingItem.id, input);
      setEditingItem(null);
      return;
    }

    if (onCreate) {
      await onCreate(input);
      setIsCreateOpen(false);
    }
  }

  async function handleDelete() {
    if (!deletingItem || !onDelete) {
      return;
    }

    await onDelete(deletingItem.id);
    setDeletingItem(null);
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {fixedType
              ? `${formatType(fixedType)} register with ownership and status.`
              : "Risks, assumptions, issues, and dependencies across visible projects."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {visibleItems.length}
          </span>
          {canCreate ? (
            <button
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              onClick={() => setIsCreateOpen(true)}
              type="button"
            >
              Create {fixedType ? formatType(fixedType) : "RAID item"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {!fixedType ? <th className="px-3 py-3">Type</th> : null}
              {!fixedProjectId ? <th className="px-3 py-3">Project</th> : null}
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Owner</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Detail</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="px-3 py-5 text-slate-500" colSpan={7}>
                  Loading RAID items...
                </td>
              </tr>
            ) : null}
            {!isLoading && visibleItems.length === 0 ? (
              <tr>
                <td className="px-3 py-5 text-slate-500" colSpan={7}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {!isLoading
              ? visibleItems.map((item) => {
                  const canEditItem =
                    permissions.canUpdate &&
                    (!isOwnOnly(permissions) || item.ownerId === permissions.currentUserId);
                  const canDeleteItem = permissions.canDelete && Boolean(onDelete);

                  return (
                    <tr key={`${item.type}-${item.id}`}>
                      {!fixedType ? (
                        <td className="px-3 py-3 font-semibold capitalize text-slate-950">
                          {formatType(item.type)}
                        </td>
                      ) : null}
                      {!fixedProjectId ? (
                        <td className="px-3 py-3 text-slate-600">
                          {item.project?.name ?? "No project"}
                        </td>
                      ) : null}
                      <td className="px-3 py-3 font-semibold text-slate-950">
                        {item.title}
                        {item.description ? (
                          <p className="mt-1 font-normal text-slate-500">
                            {item.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {formatOwner(item)}
                      </td>
                      <td className="px-3 py-3 capitalize text-slate-600">
                        {formatLabel(item.status)}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {formatDetail(item)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          {canEditItem && onUpdate ? (
                            <button
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => setEditingItem(item)}
                              type="button"
                            >
                              Edit
                            </button>
                          ) : null}
                          {canDeleteItem ? (
                            <button
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => setDeletingItem(item)}
                              type="button"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>

      {isCreateOpen || editingItem ? (
        <RaidItemDialog
          fixedProjectId={fixedProjectId}
          fixedType={fixedType}
          isSaving={isSaving}
          item={editingItem}
          onClose={() => {
            setEditingItem(null);
            setIsCreateOpen(false);
          }}
          onAddComment={onAddComment}
          onSubmit={handleSubmit}
          projects={projects}
          users={users}
        />
      ) : null}

      {deletingItem ? (
        <AppModal
          footer={
            <>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setDeletingItem(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
                disabled={isSaving}
                onClick={handleDelete}
                type="button"
              >
                Delete
              </button>
            </>
          }
          labelledById="delete-raid-dialog-title"
          onClose={() => setDeletingItem(null)}
          title={`Delete ${formatType(deletingItem.type)}`}
          widthClassName="max-w-md"
        >
            <p className="mt-2 text-sm text-slate-600">
              This will remove "{deletingItem.title}" from the RAID register.
            </p>
        </AppModal>
      ) : null}
    </section>
  );
}

function RaidItemDialog({
  fixedProjectId,
  fixedType,
  isSaving,
  item,
  onAddComment,
  onClose,
  onSubmit,
  projects,
  users,
}: {
  fixedProjectId?: string;
  fixedType?: RaidType;
  isSaving: boolean;
  item: ApiRaidItem | null;
  onAddComment?: RaidManagementProps["onAddComment"];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  projects: ApiProject[];
  users: ApiAssignableUser[];
}) {
  const type = fixedType ?? item?.type ?? "risk";
  const title = item ? `Edit ${formatType(type)}` : `Create ${formatType(type)}`;
  const [commentBody, setCommentBody] = useState("");

  return (
    <AppModal
      description="Capture ownership, status, and the detail needed for delivery follow-up."
      footer={
        <>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-70"
            disabled={isSaving}
            form="raid-item-form"
            type="submit"
          >
            {item ? "Save changes" : "Create"}
          </button>
        </>
      }
      labelledById="raid-dialog-title"
      onClose={onClose}
      title={title}
      widthClassName="max-w-3xl"
    >
      <ModalForm id="raid-item-form" onSubmit={onSubmit}>
        <ModalFormSection
          description="Capture ownership, status, and the core RAID detail needed for delivery follow-up."
          title="Core Detail"
        >
          <ModalFormGrid>
          {!fixedType ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                defaultValue={type}
                name="type"
              >
                {raidTypes.map((raidType) => (
                  <option key={raidType} value={raidType}>
                    {formatType(raidType)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input name="type" type="hidden" value={fixedType} />
          )}

          {!fixedProjectId ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Project</span>
              <select
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                defaultValue={item?.projectId ?? ""}
                name="projectId"
                required
              >
                <option value="">Choose project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input name="projectId" type="hidden" value={fixedProjectId} />
          )}

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              defaultValue={item?.title ?? ""}
              name="title"
              required
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              defaultValue={item?.description ?? ""}
              name="description"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Owner</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              defaultValue={item?.ownerId ?? ""}
              name="ownerId"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName ?? `${user.firstName} ${user.lastName}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              defaultValue={item?.status ?? defaultStatus(type)}
              name="status"
            >
              {statusOptions(type).map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
          </label>
          </ModalFormGrid>
        </ModalFormSection>

          {type === "risk" ? (
            <ModalFormSection title="Risk Controls">
              <ModalFormGrid>
              <SelectField
                defaultValue={item?.probability ?? "medium"}
                label="Probability"
                name="probability"
                options={levelOptions}
              />
              <SelectField
                defaultValue={item?.impact ?? "medium"}
                label="Impact"
                name="impact"
                options={levelOptions}
              />
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Mitigation
                </span>
                <textarea
                  className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  defaultValue={item?.mitigationPlan ?? ""}
                  name="mitigationPlan"
                />
              </label>
              </ModalFormGrid>
            </ModalFormSection>
          ) : null}

          {type === "issue" ? (
            <ModalFormSection title="Issue Resolution">
              <ModalFormGrid>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Due Date
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  defaultValue={toDateInputValue(item?.dueDate)}
                  name="dueDate"
                  type="date"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Resolution
                </span>
                <textarea
                  className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  defaultValue={item?.resolutionPlan ?? ""}
                  name="resolutionPlan"
                />
              </label>
              </ModalFormGrid>
            </ModalFormSection>
          ) : null}

          {type === "assumption" ? (
            <ModalFormSection title="Assumption Validation">
              <ModalFormGrid>
              <SelectField
                defaultValue={item?.validationStatus ?? "unvalidated"}
                label="Validation Status"
                name="validationStatus"
                options={validationStatuses}
              />
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Validation Notes
                </span>
                <textarea
                  className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  defaultValue={item?.validationNotes ?? ""}
                  name="validationNotes"
                />
              </label>
              </ModalFormGrid>
            </ModalFormSection>
          ) : null}

          {type === "dependency" ? (
            <ModalFormSection title="Dependency Tracking">
              <ModalFormGrid>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Depends On
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  defaultValue={item?.dependsOn ?? ""}
                  name="dependsOn"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Due Date
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  defaultValue={toDateInputValue(item?.dueDate)}
                  name="dueDate"
                  type="date"
                />
              </label>
              </ModalFormGrid>
            </ModalFormSection>
          ) : null}
        {item ? (
          <ModalFormSection title="Audit Trail">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Comments</h4>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {item.comments?.length ?? 0}
                  </span>
                </div>
                <div className="max-h-48 space-y-3 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                  {(item.comments?.length ?? 0) > 0 ? (
                    item.comments?.map((comment) => (
                      <article
                        className="rounded-md border border-slate-200 bg-white p-3"
                        key={comment.id}
                      >
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>{formatActor(comment.author)}</span>
                          <span>{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{comment.body}</p>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  )}
                </div>
                {onAddComment ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Add comment
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        onChange={(event) => setCommentBody(event.target.value)}
                        placeholder="Capture why this changed or the follow-up needed."
                        value={commentBody}
                      />
                    </label>
                    <button
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isSaving || !commentBody.trim()}
                      onClick={async () => {
                        if (!item || !commentBody.trim() || !onAddComment) {
                          return;
                        }

                        await onAddComment(item.id, commentBody.trim());
                        setCommentBody("");
                      }}
                      type="button"
                    >
                      Add comment
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">History</h4>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {item.history?.length ?? 0}
                  </span>
                </div>
                <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
                  {(item.history?.length ?? 0) > 0 ? (
                    item.history?.map((entry) => (
                      <article
                        className="rounded-md border border-slate-200 bg-white p-3"
                        key={entry.id}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatHistoryAction(entry.action, entry.fieldName)}
                          </p>
                          <span className="text-xs text-slate-500">
                            {formatDateTime(entry.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatActor(entry.actor)}
                        </p>
                        {entry.previousValue || entry.nextValue ? (
                          <p className="mt-2 text-sm text-slate-700">
                            {formatChangeSummary(entry.previousValue, entry.nextValue)}
                          </p>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No history yet.</p>
                  )}
                </div>
              </div>
            </div>
          </ModalFormSection>
        ) : null}
      </ModalForm>
    </AppModal>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formDataToRaidInput(
  formData: FormData,
  fixedType?: RaidType,
  fixedProjectId?: string,
): RaidMutationInput {
  const ownerId = stringOrUndefined(formData.get("ownerId"));
  const type = fixedType ?? (String(formData.get("type") ?? "risk") as RaidType);

  return {
    type,
    projectId: fixedProjectId ?? String(formData.get("projectId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: stringOrUndefined(formData.get("description")),
    ownerId,
    status: stringOrUndefined(formData.get("status")) ?? defaultStatus(type),
    severity: stringOrUndefined(formData.get("severity")),
    probability: stringOrUndefined(formData.get("probability")),
    impact: stringOrUndefined(formData.get("impact")),
    mitigationPlan: stringOrUndefined(formData.get("mitigationPlan")),
    resolutionPlan: stringOrUndefined(formData.get("resolutionPlan")),
    validationStatus: stringOrUndefined(formData.get("validationStatus")),
    validationNotes: stringOrUndefined(formData.get("validationNotes")),
    dependsOn: stringOrUndefined(formData.get("dependsOn")),
    dueDate: stringOrUndefined(formData.get("dueDate")),
  };
}

function isOwnOnly(permissions: RaidPermissions) {
  return permissions.canUpdate && !permissions.canDelete;
}

function stringOrUndefined(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();
  return stringValue || undefined;
}

function defaultStatus(type: RaidType) {
  switch (type) {
    case "risk":
      return "open";
    case "issue":
      return "open";
    case "assumption":
      return "active";
    case "dependency":
      return "pending";
  }
}

function statusOptions(type: RaidType) {
  switch (type) {
    case "risk":
      return riskStatuses;
    case "issue":
      return issueStatuses;
    case "assumption":
      return assumptionStatuses;
    case "dependency":
      return dependencyStatuses;
  }
}

function formatDetail(item: ApiRaidItem) {
  switch (item.type) {
    case "risk":
      return `P: ${formatLabel(item.probability)} / I: ${formatLabel(item.impact)}`;
    case "issue":
      return item.resolutionPlan || formatDate(item.dueDate);
    case "assumption":
      return formatLabel(item.validationStatus);
    case "dependency":
      return item.dependsOn || formatDate(item.dueDate);
  }
}

function formatOwner(item: ApiRaidItem) {
  return item.owner
    ? `${item.owner.firstName} ${item.owner.lastName}`
    : "Unassigned";
}

function formatType(type: RaidType) {
  return type.replaceAll("_", " ");
}

function formatLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "Not set";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatActor(
  actor?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null,
) {
  if (!actor) {
    return "System";
  }

  return `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || "System";
}

function formatHistoryAction(action: string, fieldName?: string | null) {
  switch (action) {
    case "status_changed":
      return "Status changed";
    case "owner_changed":
      return "Owner changed";
    case "commented":
      return "Comment added";
    case "created":
      return "Item created";
    case "deleted":
      return "Item soft deleted";
    default:
      return fieldName ? `${formatLabel(fieldName)} updated` : "Item updated";
  }
}

function formatChangeSummary(previousValue?: string | null, nextValue?: string | null) {
  return `${previousValue ?? "Not set"} -> ${nextValue ?? "Not set"}`;
}
