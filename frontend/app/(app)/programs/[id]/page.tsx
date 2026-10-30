"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getCustomers, type ApiCustomer } from "@/features/customers";
import {
  attachProgramProject,
  createProgramProject,
  getAvailableProjects,
  getProgram,
  getProgramLeads,
  personLabel,
  programProjectLine,
  type AvailableProject,
  type ProgramDetail,
  type ProgramLead,
} from "@/features/programs";

export default function ProgramPage() {
  const params = useParams<{ id: string }>();
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [available, setAvailable] = useState<AvailableProject[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [leads, setLeads] = useState<ProgramLead[]>([]);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [leadUserId, setLeadUserId] = useState("");
  const [targetFinish, setTargetFinish] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const next = await getProgram(params.id);
    setProgram(next);
    if (!next.editable) return;
    const [projects, people, books] = await Promise.all([
      getAvailableProjects(params.id),
      getProgramLeads(),
      getCustomers("all"),
    ]);
    setAvailable(projects);
    setLeads(people);
    setCustomers(books);
    setProjectId(projects[0]?.id ?? "");
    setCustomerId(books[0]?.id ?? "");
    setLeadUserId(people[0]?.id ?? "");
  }, [params.id]);

  useEffect(() => {
    let mounted = true;
    load().catch((requestError: unknown) => {
      if (mounted) setError(requestError instanceof Error ? requestError.message : "Unable to load this program");
    });
    return () => {
      mounted = false;
    };
  }, [load]);

  if (error) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  }
  if (!program) {
    return <p className="text-sm text-slate-500">Loading program...</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description={`${program.ownerName} owns this program. Each overdue line matches that project's overview.`}
        eyebrow="Programs"
        title={program.name}
      />
      <p>
        <Link className="text-sm font-medium text-brand hover:text-teal-800" href="/programs">
          All programs
        </Link>
      </p>
      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
        {program.projects.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No projects in this program yet.</p>
        ) : (
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Overdue</th>
                <th className="px-4 py-3">Finish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {program.projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-slate-950 hover:text-brand" href={`/projects/${project.id}`}>
                      {project.name}
                    </Link>
                  </td>
                  <td className="truncate px-4 py-3 text-slate-700">{project.customerName || "—"}</td>
                  <td className="truncate px-4 py-3 text-slate-700">{project.leadName}</td>
                  <td className="px-4 py-3 text-slate-700">{programProjectLine(project.work)}</td>
                  <td className="px-4 py-3 text-slate-700">{project.targetFinish?.slice(0, 10) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {program.editable ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft"
            onSubmit={(event) => {
              event.preventDefault();
              attachProgramProject(params.id, projectId)
                .then(() => load())
                .catch((requestError: unknown) => {
                  setError(requestError instanceof Error ? requestError.message : "Unable to add the project");
                });
            }}
          >
            <h2 className="text-sm font-semibold text-slate-950">Add an existing project</h2>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              onChange={(event) => setProjectId(event.target.value)}
              value={projectId}
            >
              {available.length === 0 ? <option value="">No unassigned projects</option> : null}
              {available.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                  {project.customerName ? ` · ${project.customerName}` : ""}
                </option>
              ))}
            </select>
            <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800" disabled={!projectId} type="submit">
              Add to program
            </button>
          </form>
          <form
            className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft"
            onSubmit={(event) => {
              event.preventDefault();
              createProgramProject(params.id, {
                customerId,
                leadUserId,
                name,
                targetFinish: targetFinish || undefined,
              })
                .then(() => {
                  setName("");
                  setTargetFinish("");
                  return load();
                })
                .catch((requestError: unknown) => {
                  setError(requestError instanceof Error ? requestError.message : "Unable to create the project");
                });
            }}
          >
            <h2 className="text-sm font-semibold text-slate-950">Create a project in this program</h2>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setName(event.target.value)}
              placeholder="Project name"
              required
              value={name}
            />
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              onChange={(event) => setCustomerId(event.target.value)}
              required
              value={customerId}
            >
              <option value="">Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              onChange={(event) => setLeadUserId(event.target.value)}
              value={leadUserId}
            >
              <option value="">Lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {personLabel(lead)}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setTargetFinish(event.target.value)}
              type="date"
              value={targetFinish}
            />
            <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800" type="submit">
              Create project
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
