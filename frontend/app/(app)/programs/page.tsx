"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { getAuthMe, hasAnyPermission, storeAuthMe } from "@/features/auth";
import {
  acceptProjectRequest,
  createProgram,
  getOpenProjectRequests,
  getProgramLeads,
  getPrograms,
  personLabel,
  programOverdueCount,
  type ProgramLead,
  type ProgramListItem,
  type ProjectRequest,
} from "@/features/programs";

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramListItem[]>([]);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [leads, setLeads] = useState<ProgramLead[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    const [nextPrograms, authMe] = await Promise.all([getPrograms(), getAuthMe()]);
    storeAuthMe(authMe);
    const keys = authMe.permissions.map((permission) => permission.key);
    const editor = hasAnyPermission(keys, ["project.create", "user.manage"]);
    setCanEdit(editor);
    setPrograms(nextPrograms);
    if (editor) {
      const [nextRequests, nextLeads] = await Promise.all([
        getOpenProjectRequests(),
        getProgramLeads(),
      ]);
      setRequests(nextRequests);
      setLeads(nextLeads);
    }
  }

  useEffect(() => {
    let mounted = true;
    load()
      .catch((requestError: unknown) => {
        if (mounted) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load programs");
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Projects grouped for leadership. The overdue count is the same one Today uses."
        eyebrow="Programs"
        title="Programs"
      />
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {canEdit ? (
        <form
          className="flex max-w-xl flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            createProgram({ name })
              .then(() => {
                setName("");
                return load();
              })
              .catch((requestError: unknown) => {
                setError(requestError instanceof Error ? requestError.message : "Unable to create the program");
              });
          }}
        >
          <label className="block flex-1">
            <span className="text-sm font-medium text-slate-700">New program</span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800" type="submit">
            Create
          </button>
        </form>
      ) : null}
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
        {isLoading ? <p className="px-4 py-6 text-sm text-slate-500">Loading programs...</p> : null}
        {!isLoading && programs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No programs yet.</p>
        ) : null}
        {!isLoading && programs.length > 0 ? (
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Projects</th>
                <th className="px-4 py-3">Overdue</th>
                <th className="px-4 py-3">Customers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programs.map((program) => (
                <tr key={program.id}>
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-slate-950 hover:text-brand" href={`/programs/${program.id}`}>
                      {program.name}
                    </Link>
                  </td>
                  <td className="truncate px-4 py-3 text-slate-700">{program.ownerName}</td>
                  <td className="px-4 py-3 text-slate-700">{program.projectCount}</td>
                  <td className="px-4 py-3 text-slate-700">{programOverdueCount(program.projects)}</td>
                  <td className="px-4 py-3 text-slate-700">{program.customersTouched}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
      {canEdit ? (
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-950">Project requests</h2>
          {requests.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No open requests.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((request) => (
                <RequestRow
                  key={request.id}
                  leads={leads}
                  onAccepted={() => load().catch(() => setError("Unable to refresh requests"))}
                  request={request}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function RequestRow({
  leads,
  onAccepted,
  request,
}: {
  leads: ProgramLead[];
  onAccepted: () => void;
  request: ProjectRequest;
}) {
  const [leadUserId, setLeadUserId] = useState(leads[0]?.id ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_16rem_auto] lg:items-end">
      <div className="min-w-0">
        <p className="font-medium text-slate-950">{request.name}</p>
        <p className="text-sm text-slate-600">
          {request.customerName || "Customer"} · {request.targetFinish?.slice(0, 10) || "No finish"} · Requested
        </p>
        {request.note ? <p className="mt-1 text-sm text-slate-700">{request.note}</p> : null}
        {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
      </div>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Lead</span>
        <select
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          onChange={(event) => setLeadUserId(event.target.value)}
          value={leadUserId}
        >
          <option value="">Choose a lead</option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {personLabel(lead)}
            </option>
          ))}
        </select>
      </label>
      <button
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        disabled={isSaving || !leadUserId}
        onClick={() => {
          setIsSaving(true);
          setError(null);
          acceptProjectRequest(request.id, leadUserId)
            .then(() => onAccepted())
            .catch((requestError: unknown) => {
              setError(requestError instanceof Error ? requestError.message : "Unable to assign the lead");
            })
            .finally(() => setIsSaving(false));
        }}
        type="button"
      >
        Assign lead
      </button>
    </li>
  );
}
