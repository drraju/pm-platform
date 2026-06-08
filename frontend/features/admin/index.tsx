"use client";

import Link from "next/link";
import React from "react";
import { useAuthorization } from "@/features/auth";

export const adminLinks = [
  { href: "/admin/users", label: "User Management" },
  { href: "/admin/roles", label: "Role Management" },
  { href: "/admin/permissions", label: "Permission Management" },
  { href: "/admin/role-matrix", label: "Role-Permission Matrix" },
  { href: "/admin/projects", label: "Project Membership Management" },
  { href: "/admin", label: "Audit Logs" },
];

export function AdminGate({ children }: { children: React.ReactNode }) {
  const authorization = useAuthorization();

  if (authorization.isLoading) {
    return (
      <AdminPanel title="Administration">Loading administration...</AdminPanel>
    );
  }

  if (authorization.profile?.roleName !== "SUPER_ADMIN") {
    return (
      <AdminPanel title="Access denied">
        Administration is available only to platform administrators.
      </AdminPanel>
    );
  }

  return <>{children}</>;
}

export function AdminPanel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-2">
      {adminLinks.map((link) => (
        <Link
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminPageShell({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <AdminGate>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
        </div>
        <AdminNav />
        {children}
      </div>
    </AdminGate>
  );
}

export function EmptyAdminState({ message }: { message: string }) {
  return <p className="text-sm text-slate-500">{message}</p>;
}

export function AdminError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
