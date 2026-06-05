"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getProjects, type ApiProject } from "@/features/projects";
import { createRaidItem, getRaidItems, type ApiRaidItem } from "@/features/raid";
import { getUsers, type ApiUser } from "@/features/users";

const raidTypes: Array<ApiRaidItem["type"]> = ["risk", "assumption", "issue", "dependency"];

export default function RaidPage() {
  const [items, setItems] = useState<ApiRaidItem[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  async function loadData() {
    setError(null);
    setIsLoading(true);
    try {
      const [raidData, projectData, userData] = await Promise.all([
        getRaidItems(),
        getProjects(),
        getUsers(),
      ]);
      setItems(raidData);
      setProjects(projectData);
      setUsers(userData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load RAID");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const ownerId = String(formData.get("ownerId") ?? "");
    const type = String(formData.get("type") ?? "risk") as ApiRaidItem["type"];

    try {
      await createRaidItem({
        type,
        projectId: String(formData.get("projectId") ?? ""),
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        ownerId: ownerId || undefined,
        status: String(formData.get("status") ?? "open"),
        severity: String(formData.get("severity") ?? "medium"),
        probability: String(formData.get("severity") ?? "medium"),
        impact: String(formData.get("severity") ?? "medium"),
        validationStatus: "unvalidated",
      });
      form.reset();
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create RAID item");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Capture risks, assumptions, issues, and dependencies with severity, ownership, status, and escalation context."
        eyebrow="RAID register"
        title="RAID"
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <form
        className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-soft lg:grid-cols-[150px_1fr_1fr_160px_160px_auto]"
        onSubmit={handleCreateItem}
      >
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Type</span>
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" name="type">
            {raidTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Project</span>
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" name="projectId" required>
            <option value="">Choose project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="title" required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Owner</span>
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" name="ownerId">
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Severity</span>
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" name="severity">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <button
          className="mt-7 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-70"
          disabled={isCreating || projects.length === 0}
          type="submit"
        >
          Add item
        </button>
        <input name="description" type="hidden" value="" />
        <input name="status" type="hidden" value="open" />
      </form>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="hidden grid-cols-[0.7fr_1.4fr_1fr_0.8fr_0.8fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <span>Type</span>
          <span>Title</span>
          <span>Project</span>
          <span>Owner</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? <p className="px-4 py-6 text-sm text-slate-500">Loading RAID items...</p> : null}
          {!isLoading && items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No RAID items have been created yet.</p>
          ) : null}
          {items.map((item) => (
            <article className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[0.7fr_1.4fr_1fr_0.8fr_0.8fr] md:items-center" key={`${item.type}-${item.id}`}>
              <span className="font-semibold capitalize text-slate-950">{item.type}</span>
              <span className="text-slate-700">{item.title}</span>
              <span className="text-slate-600">{item.project?.name ?? "No project"}</span>
              <span className="text-slate-600">
                {item.owner ? `${item.owner.firstName} ${item.owner.lastName}` : "Unassigned"}
              </span>
              <span className="capitalize text-slate-600">{item.status}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
