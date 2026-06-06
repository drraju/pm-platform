"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getRaidItems, type ApiRaidItem } from "@/features/raid";

export default function RisksPage() {
  const [risks, setRisks] = useState<ApiRaidItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRisks() {
      setError(null);
      setIsLoading(true);
      try {
        const items = await getRaidItems();
        setRisks(items.filter((item) => item.type === "risk"));
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load risks",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadRisks();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        description="A focused view of risk exposure across active projects."
        eyebrow="RAID register"
        title="Risks"
      />

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-soft">
        <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <span>Risk</span>
          <span>Project</span>
          <span>Owner</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              Loading risks...
            </p>
          ) : null}
          {!isLoading && risks.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              No risks have been created yet.
            </p>
          ) : null}
          {risks.map((risk) => (
            <article
              className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr] md:items-center"
              key={risk.id}
            >
              <span className="font-semibold text-slate-950">{risk.title}</span>
              <span className="text-slate-600">
                {risk.project?.name ?? "No project"}
              </span>
              <span className="text-slate-600">
                {risk.owner
                  ? `${risk.owner.firstName} ${risk.owner.lastName}`
                  : "Unassigned"}
              </span>
              <span className="capitalize text-slate-600">{risk.status}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
