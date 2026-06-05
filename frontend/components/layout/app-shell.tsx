import React from "react";
import Link from "next/link";

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/projects" },
  { label: "Users", href: "/users" },
  { label: "Tasks", href: "/tasks" },
  { label: "RAID", href: "/raid" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white px-5 py-6 lg:block">
        <Link className="block" href="/dashboard">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">
            PM Platform
          </span>
          <span className="mt-2 block text-xl font-semibold">Command Center</span>
        </Link>

        <nav aria-label="Primary navigation" className="mt-10 space-y-1">
          {navigation.map((item) => (
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-ink"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Enterprise delivery
              </p>
              <p className="text-sm font-medium text-slate-900">
                Portfolio operations workspace
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">Alex Morgan</p>
                <p className="text-xs text-slate-500">Program Director</p>
              </div>
              <div className="grid size-10 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
                AM
              </div>
            </div>
          </div>

          <nav
            aria-label="Mobile navigation"
            className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden"
          >
            {navigation.map((item) => (
              <Link
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
