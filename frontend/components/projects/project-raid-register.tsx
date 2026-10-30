"use client";

import React, { FormEvent, useState } from "react";
import type { ApiProjectMember, ApiRaidItem } from "@/lib/api/client";

const sections: Array<{
  empty: string;
  label: string;
  singular: string;
  type: ApiRaidItem["type"];
}> = [
  { empty: "No risks recorded.", label: "Risks", singular: "Risk", type: "risk" },
  { empty: "No issues recorded.", label: "Issues", singular: "Issue", type: "issue" },
  {
    empty: "No assumptions recorded.",
    label: "Assumptions",
    singular: "Assumption",
    type: "assumption",
  },
  {
    empty: "No dependencies recorded.",
    label: "Dependencies",
    singular: "Dependency",
    type: "dependency",
  },
];

const statusesByType: Record<ApiRaidItem["type"], string[]> = {
  assumption: ["active", "validated", "invalidated", "closed"],
  dependency: ["pending", "in_progress", "blocked", "met"],
  issue: ["open", "in_progress", "blocked", "resolved", "closed"],
  risk: ["open", "monitoring", "mitigating", "closed"],
};

const statusWords: Record<string, string> = {
  active: "Active",
  blocked: "Blocked",
  closed: "Closed",
  in_progress: "Doing",
  invalidated: "Invalidated",
  met: "Met",
  mitigating: "Mitigating",
  monitoring: "Monitoring",
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  validated: "Validated",
};

const defaultStatus: Record<ApiRaidItem["type"], string> = {
  assumption: "active",
  dependency: "pending",
  issue: "open",
  risk: "open",
};

export function raidStatusLabel(status: string) {
  return statusWords[status] ?? status;
}

export type RaidDraft = {
  description: string;
  dueDate: string;
  ownerId: string;
  title: string;
  type: ApiRaidItem["type"];
};

type ProjectRaidRegisterProps = {
  canAdd: boolean;
  canUpdate: boolean;
  isSaving?: boolean;
  items: ApiRaidItem[];
  members: ApiProjectMember[];
  onCreate: (draft: RaidDraft) => Promise<void> | void;
  onStatusChange: (itemId: string, status: string) => Promise<void> | void;
};

function personName(person?: {
  firstName?: string | null;
  lastName?: string | null;
} | null) {
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return name || "Unassigned";
}

export function ProjectRaidRegister({
  canAdd,
  canUpdate,
  isSaving = false,
  items,
  members,
  onCreate,
  onStatusChange,
}: ProjectRaidRegisterProps) {
  const [draft, setDraft] = useState<RaidDraft>({
    description: "",
    dueDate: "",
    ownerId: "",
    title: "",
    type: "risk",
  });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) {
      return;
    }
    await onCreate({ ...draft, title });
    setDraft((current) => ({
      ...current,
      description: "",
      dueDate: "",
      title: "",
    }));
  }

  return (
    <div className="space-y-8">
      {canAdd ? (
        <form className="space-y-3" onSubmit={handleCreate}>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="raid-type">
              Type
            </label>
            <select
              className="h-9 rounded-md border border-slate-300 px-2 text-sm"
              id="raid-type"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as ApiRaidItem["type"],
                }))
              }
              value={draft.type}
            >
              {sections.map((section) => (
                <option key={section.type} value={section.type}>
                  {section.singular}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="raid-title">
              Title
            </label>
            <input
              className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-sm"
              id="raid-title"
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="What needs watching"
              value={draft.title}
            />
            <label className="sr-only" htmlFor="raid-owner">
              Owner
            </label>
            <select
              className="h-9 rounded-md border border-slate-300 px-2 text-sm"
              id="raid-owner"
              onChange={(event) =>
                setDraft((current) => ({ ...current, ownerId: event.target.value }))
              }
              value={draft.ownerId}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {personName(member.user)}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="raid-due">
              Due date
            </label>
            <input
              className="h-9 rounded-md border border-slate-300 px-2 text-sm"
              id="raid-due"
              onChange={(event) =>
                setDraft((current) => ({ ...current, dueDate: event.target.value }))
              }
              type="date"
              value={draft.dueDate}
            />
            <button
              className="h-9 rounded-md bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              disabled={isSaving || draft.title.trim().length === 0}
              type="submit"
            >
              Add
            </button>
          </div>
          <label className="sr-only" htmlFor="raid-note">
            Note
          </label>
          <input
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            id="raid-note"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Note"
            value={draft.description}
          />
        </form>
      ) : null}

      {sections.map((section) => {
        const rows = items.filter((item) => item.type === section.type);
        return (
          <section key={section.type}>
            <h2 className="text-sm font-semibold text-slate-950">{section.label}</h2>
            {rows.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">{section.empty}</p>
            ) : (
              <table className="mt-2 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-medium">Title</th>
                    <th className="py-2 pr-3 font-medium">Owner</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr className="border-b border-slate-100" key={item.id}>
                      <td className="py-2 pr-3">
                        <div className="font-medium text-slate-950">{item.title}</div>
                        {item.description ? (
                          <div className="text-slate-600">{item.description}</div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-slate-700">
                        {personName(item.owner)}
                      </td>
                      <td className="py-2 pr-3">
                        {canUpdate ? (
                          <select
                            aria-label={`Status for ${item.title}`}
                            className="h-8 rounded-md border border-slate-300 px-2 text-sm"
                            onChange={(event) =>
                              void onStatusChange(item.id, event.target.value)
                            }
                            value={item.status}
                          >
                            {(statusesByType[item.type] ?? [item.status]).map(
                              (status) => (
                                <option key={status} value={status}>
                                  {raidStatusLabel(status)}
                                </option>
                              ),
                            )}
                          </select>
                        ) : (
                          raidStatusLabel(item.status)
                        )}
                      </td>
                      <td className="py-2 text-slate-700">
                        {item.dueDate ? item.dueDate.slice(0, 10) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}

export { defaultStatus };
