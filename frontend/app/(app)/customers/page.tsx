"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { getAuthMe, hasPermission, storeAuthMe } from "@/features/auth";
import {
  customerStatusLabels,
  getCustomers,
  ownerName,
  type ApiCustomer,
} from "@/features/customers";

const filters = ["active", "prospect", "paused", "closed", "all"] as const;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [status, setStatus] = useState<(typeof filters)[number]>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const authMe = await getAuthMe();
        if (!isMounted) return;
        storeAuthMe(authMe);
        const keys = authMe.permissions.map((permission) => permission.key);
        setCanManage(hasPermission(keys, "customer.manage"));
        setCustomers(await getCustomers(status));
      } catch (requestError) {
        if (!isMounted) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load customers");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [status]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.domain, ownerName(customer.owner), customer.owner.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [customers, search]);

  const showAdd = canManage && !isLoading && customers.length === 0 && status === "all" && !search.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          canManage ? (
            <Link className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800" href="/customers/new">
              Add a customer
            </Link>
          ) : null
        }
        description="One list for sales, customer success, and delivery."
        eyebrow="Customers"
        title="Customers"
      />

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-soft sm:grid-cols-[1fr_16rem]">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Search</span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, domain, or owner"
            type="search"
            value={search}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Status</span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setStatus(event.target.value as (typeof filters)[number])}
            value={status}
          >
            {filters.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All" : customerStatusLabels[option]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
        {isLoading ? <p className="px-4 py-6 text-sm text-slate-500">Loading customers...</p> : null}
        {showAdd ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-slate-600">No customers yet.</p>
            <Link className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800" href="/customers/new">
              Add a customer
            </Link>
          </div>
        ) : null}
        {!isLoading && !showAdd && visible.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No customers match this filter.</p>
        ) : null}
        {!isLoading && visible.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Renewal</th>
                <th className="px-4 py-3 font-semibold">Projects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-slate-950 hover:text-brand" href={`/customers/${customer.id}`}>
                      {customer.name}
                    </Link>
                    {customer.domain ? <p className="text-xs text-slate-500">{customer.domain}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{customerStatusLabels[customer.status]}</td>
                  <td className="px-4 py-3 text-slate-700">{ownerName(customer.owner)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatRenewal(customer.renewalDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{customer.projectCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}

function formatRenewal(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}
