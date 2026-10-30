"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { hasPermission, getAuthMe, storeAuthMe } from "@/features/auth";
import {
  customerProjectPath,
  customerStatusLabels,
  createCustomerCommitment,
  createCustomerProjectRequest,
  dismissCustomerCommitment,
  getCustomer,
  getCustomerCommitments,
  getCustomerProjectRequests,
  getCustomerProjects,
  ownerName,
  updateCustomer,
  type ApiCommitment,
  type ApiCustomer,
  type ApiCustomerProject,
  type ApiProjectRequest,
} from "@/features/customers";
import { CustomerForm } from "@/features/customers/customer-form";
import { CustomerSuccess } from "@/components/customers/customer-success";

export default function CustomerPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<ApiCustomer | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [canViewSuccess, setCanViewSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tab, setTab] = useState<"overview" | "projects" | "success">("overview");
  const [projects, setProjects] = useState<ApiCustomerProject[]>([]);
  const [requests, setRequests] = useState<ApiProjectRequest[]>([]);
  const [commitments, setCommitments] = useState<ApiCommitment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const authMe = await getAuthMe();
        if (!isMounted) return;
        storeAuthMe(authMe);
        const keys = authMe.permissions.map((permission) => permission.key);
        const success = hasPermission(keys, "customer_success.view");
        setCanManage(hasPermission(keys, "customer.manage"));
        setCanViewSuccess(success);
        setCustomer(await getCustomer(params.id));
        setProjects(await getCustomerProjects(params.id));
        if (hasPermission(keys, "customer.manage") && !success) {
          setRequests(await getCustomerProjectRequests(params.id));
        }
        if (success) {
          setCommitments(await getCustomerCommitments(params.id));
        }
      } catch (requestError) {
        if (!isMounted) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load this customer");
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (error) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  }
  if (!customer) {
    return <p className="text-sm text-slate-500">Loading customer...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link className="text-sm font-medium text-brand hover:text-teal-800" href="/customers">
          Customers
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{customer.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {customerStatusLabels[customer.status]} · {ownerName(customer.owner)}
              {customer.domain ? ` · ${customer.domain}` : ""}
            </p>
          </div>
          {canManage && !isEditing ? (
            <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setIsEditing(true)} type="button">
              Edit
            </button>
          ) : null}
        </div>
      </div>

      {isEditing ? null : (
        <div className="flex gap-2 border-b border-slate-200">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
          <TabButton active={tab === "projects"} onClick={() => setTab("projects")}>Projects</TabButton>
          {canViewSuccess ? (
            <TabButton active={tab === "success"} onClick={() => setTab("success")}>Success</TabButton>
          ) : null}
        </div>
      )}

      {isEditing ? (
        <CustomerForm customer={customer} />
      ) : tab === "success" && canViewSuccess ? (
        <CustomerSuccess
          commitments={commitments}
          customer={customer}
          isSaving={isSaving}
          onCreate={async (input) => {
            setIsSaving(true);
            setError(null);
            try {
              await createCustomerCommitment(params.id, input);
              setCommitments(await getCustomerCommitments(params.id));
            } catch (requestError) {
              setError(requestError instanceof Error ? requestError.message : "Unable to add the commitment");
            } finally {
              setIsSaving(false);
            }
          }}
          onDismiss={async (commitment) => {
            setIsSaving(true);
            setError(null);
            try {
              await dismissCustomerCommitment(params.id, commitment.id);
              setCommitments(await getCustomerCommitments(params.id));
            } catch (requestError) {
              setError(requestError instanceof Error ? requestError.message : "Unable to dismiss the commitment");
            } finally {
              setIsSaving(false);
            }
          }}
          onSave={async (input) => {
            setIsSaving(true);
            setError(null);
            try {
              setCustomer(await updateCustomer(params.id, input));
            } catch (requestError) {
              setError(requestError instanceof Error ? requestError.message : "Unable to save success details");
            } finally {
              setIsSaving(false);
            }
          }}
          projects={projects}
        />
      ) : tab === "projects" ? (
        <div className="max-w-3xl space-y-4">
          {canManage && !canViewSuccess ? (
            <RequestProjectForm
              customerId={params.id}
              onCreated={async () => setRequests(await getCustomerProjectRequests(params.id))}
            />
          ) : null}
          {requests.length > 0 ? (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
              {requests.map((request) => (
                <li className="px-4 py-3" key={request.id}>
                  <p className="font-semibold text-slate-950">{request.name}</p>
                  <p className="text-sm text-slate-600">
                    Requested · {request.targetFinish?.slice(0, 10) || "No finish"} · A lead has not been assigned, so this is not on a plan.
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
          {projects.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No projects for this customer yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Finish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td className="px-4 py-3">
                      <ProjectName project={project} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{project.leadName}</td>
                    <td className="px-4 py-3 text-slate-700">{projectStatusLabel(project.status)}</td>
                    <td className="px-4 py-3 text-slate-700">{project.targetFinish?.slice(0, 10) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        </div>
      ) : (
        <section className="max-w-2xl rounded-md border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="Status" value={customerStatusLabels[customer.status]} />
            <Detail label="Owner" value={ownerName(customer.owner)} />
            <Detail label="Domain" value={customer.domain || "—"} />
            <Detail label="Renewal" value={customer.renewalDate?.slice(0, 10) || "—"} />
            <Detail label="Last touch" value={customer.lastTouch?.slice(0, 10) || "—"} />
            <Detail label="Projects" value={String(customer.projectCount)} />
          </dl>
          {"commercialNote" in customer ? (
            <Note label="Commercial note" value={customer.commercialNote} />
          ) : null}
          {"successNote" in customer ? (
            <Note label="Success note" value={customer.successNote} />
          ) : null}
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`border-b-2 px-3 py-2 text-sm font-semibold ${active ? "border-brand text-slate-950" : "border-transparent text-slate-500"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ProjectName({ project }: { project: ApiCustomerProject }) {
  const href = customerProjectPath(project);
  if (!href) {
    return <span className="font-semibold text-slate-950">{project.name}</span>;
  }
  return (
    <Link className="font-semibold text-slate-950 hover:text-brand" href={href}>
      {project.name}
    </Link>
  );
}

function RequestProjectForm({
  customerId,
  onCreated,
}: {
  customerId: string;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [targetFinish, setTargetFinish] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <form
      className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        setIsSaving(true);
        setError(null);
        createCustomerProjectRequest(customerId, {
          name,
          note,
          targetFinish: targetFinish || undefined,
        })
          .then(async () => {
            setName("");
            setTargetFinish("");
            setNote("");
            await onCreated();
          })
          .catch((requestError: unknown) => {
            setError(requestError instanceof Error ? requestError.message : "Unable to request the project");
          })
          .finally(() => setIsSaving(false));
      }}
    >
      <h2 className="text-sm font-semibold text-slate-950">Request a project</h2>
      <p className="text-sm text-slate-600">The lead owns delivery after they are assigned. This stays off the plan until then.</p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <input
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        onChange={(event) => setName(event.target.value)}
        placeholder="Project name"
        required
        value={name}
      />
      <input
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        onChange={(event) => setTargetFinish(event.target.value)}
        type="date"
        value={targetFinish}
      />
      <textarea
        className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note to the lead"
        value={note}
      />
      <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60" disabled={isSaving} type="submit">
        Request a project
      </button>
    </form>
  );
}

function projectStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Active",
    done: "Done",
    paused: "Paused",
    planned: "Planned",
  };
  return labels[status] ?? status.replaceAll("_", " ");
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function Note({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{value?.trim() ? value : "No note yet."}</p>
    </div>
  );
}
