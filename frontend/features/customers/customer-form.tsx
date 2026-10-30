"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthMe } from "@/features/auth";
import {
  createCustomer,
  customerStatusLabels,
  getCustomerFieldAccess,
  getCustomerOwners,
  ownerName,
  updateCustomer,
  type ApiCustomer,
  type ApiCustomerOwner,
  type CustomerFieldAccess,
  type CustomerStatus,
} from "@/features/customers";

const statuses: CustomerStatus[] = ["prospect", "active", "paused", "closed"];

type CustomerFormProps = {
  customer?: ApiCustomer;
};

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter();
  const [owners, setOwners] = useState<ApiCustomerOwner[]>([]);
  const [access, setAccess] = useState<CustomerFieldAccess | null>(null);
  const [name, setName] = useState(customer?.name ?? "");
  const [status, setStatus] = useState<CustomerStatus>(customer?.status ?? "prospect");
  const [ownerId, setOwnerId] = useState(customer?.owner.id ?? "");
  const [domain, setDomain] = useState(customer?.domain ?? "");
  const [renewalDate, setRenewalDate] = useState(customer?.renewalDate?.slice(0, 10) ?? "");
  const [lastTouch, setLastTouch] = useState(customer?.lastTouch?.slice(0, 10) ?? "");
  const [commercialNote, setCommercialNote] = useState(customer?.commercialNote ?? "");
  const [successNote, setSuccessNote] = useState(customer?.successNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getCustomerOwners(), getCustomerFieldAccess(), getAuthMe()])
      .then(([people, fieldAccess, authMe]) => {
        if (!isMounted) return;
        setOwners(people);
        setAccess(fieldAccess);
        if (!customer) {
          const self = people.find((person) => person.id === authMe.user.id);
          setOwnerId(self?.id ?? "");
        }
      })
      .catch((requestError: unknown) => {
        if (!isMounted) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load the form");
      });
    return () => {
      isMounted = false;
    };
  }, [customer]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const input = {
      domain,
      name,
      ownerId,
      status,
      ...(access?.renewal ? { renewalDate } : {}),
      ...(access?.commercial ? { commercialNote } : {}),
      ...(access?.success ? { lastTouch, successNote } : {}),
    };
    try {
      const saved = customer
        ? await updateCustomer(customer.id, input)
        : await createCustomer(input);
      if (customer) {
        window.location.assign(`/customers/${saved.id}`);
        return;
      }
      router.push(`/customers/${saved.id}`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save the customer");
      setIsSaving(false);
    }
  }

  return (
    <form className="max-w-2xl space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-soft" onSubmit={(event) => void submit(event)}>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Name</span>
        <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setName(event.target.value)} required value={name} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setStatus(event.target.value as CustomerStatus)} value={status}>
            {statuses.map((option) => (
              <option key={option} value={option}>{customerStatusLabels[option]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Owner</span>
          <select className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setOwnerId(event.target.value)} required value={ownerId}>
            <option value="">Choose a person</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>{ownerName(owner)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Domain</span>
          <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setDomain(event.target.value)} placeholder="example.com" value={domain} />
        </label>
        {access?.renewal ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Renewal date</span>
            <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setRenewalDate(event.target.value)} type="date" value={renewalDate} />
          </label>
        ) : null}
        {access?.success ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Last touch</span>
            <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setLastTouch(event.target.value)} type="date" value={lastTouch} />
          </label>
        ) : null}
      </div>
      {access?.commercial ? (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Commercial note</span>
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setCommercialNote(event.target.value)} value={commercialNote} />
        </label>
      ) : null}
      {access?.success ? (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Success note</span>
          <textarea className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(event) => setSuccessNote(event.target.value)} value={successNote} />
        </label>
      ) : null}
      <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60" disabled={isSaving} type="submit">
        {isSaving ? "Saving..." : customer ? "Save customer" : "Add a customer"}
      </button>
    </form>
  );
}
