"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { PageHeader } from "@/components/layout/page-header";
import {
  ProjectHealthBadge,
  ProjectHealthReasons,
} from "@/components/projects/project-health-badge";
import {
  getPortfolioSummary,
  type ApiOpenRisksBySeverity,
  type ApiPortfolioProjectAttention,
  type ApiPortfolioSummary,
} from "@/features/portfolio";

export default function PortfolioPage() {
  const [summary, setSummary] = useState<ApiPortfolioSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPortfolioSummary() {
      setError(null);
      setIsLoading(true);
      try {
        setSummary(await getPortfolioSummary());
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load portfolio summary",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPortfolioSummary();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        description="A portfolio-level view of project health across active delivery."
        eyebrow="Portfolio dashboard"
        title="Portfolio"
      />

      {isLoading ? <PortfolioLoadingState /> : null}

      {!isLoading && error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {!isLoading && !error && summary ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total Projects" value={summary.totalProjects} />
            <SummaryCard
              label="Green Projects"
              tone="success"
              value={summary.greenProjects}
            />
            <SummaryCard
              label="Amber Projects"
              tone="warning"
              value={summary.amberProjects}
            />
            <SummaryCard
              label="Red Projects"
              tone="danger"
              value={summary.redProjects}
            />
          </section>

          <OpenRisksBySeverityWidget
            openRisksBySeverity={summary.openRisksBySeverity}
          />

          {summary.totalProjects === 0 ? (
            <section className="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-soft">
              No projects are available in the portfolio yet.
            </section>
          ) : null}

          {summary.totalProjects > 0 ? (
            <ProjectsRequiringAttentionWidget
              projects={summary.projectsRequiringAttention}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function OpenRisksBySeverityWidget({
  openRisksBySeverity,
}: {
  openRisksBySeverity: ApiOpenRisksBySeverity;
}) {
  const totalOpenRisks =
    openRisksBySeverity.critical +
    openRisksBySeverity.high +
    openRisksBySeverity.medium +
    openRisksBySeverity.low;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">
          Open Risks by Severity
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Open risks grouped by impact severity.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Critical"
          tone="danger"
          value={openRisksBySeverity.critical}
        />
        <SummaryCard
          label="High"
          tone="danger"
          value={openRisksBySeverity.high}
        />
        <SummaryCard
          label="Medium"
          tone="warning"
          value={openRisksBySeverity.medium}
        />
        <SummaryCard label="Low" tone="success" value={openRisksBySeverity.low} />
      </section>

      {totalOpenRisks === 0 ? (
        <section className="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-soft">
          No open risks are currently recorded.
        </section>
      ) : null}
    </section>
  );
}

function ProjectsRequiringAttentionWidget({
  projects,
}: {
  projects: ApiPortfolioProjectAttention[];
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Projects Requiring Attention
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Amber and red projects across the portfolio.
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {projects.length}
        </span>
      </div>

      {projects.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          No amber or red projects require attention.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {projects.map((project) => (
            <Link
              className="block rounded-md px-3 py-4 transition hover:bg-slate-50"
              href={`/projects/${project.id}`}
              key={project.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-semibold text-slate-950">
                  {project.name}
                </h3>
                <ProjectHealthBadge
                  reasons={project.reasons}
                  status={project.healthStatus}
                />
              </div>
              <ProjectHealthReasons reasons={project.reasons} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function PortfolioLoadingState() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="h-32 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
          key={index}
        />
      ))}
    </section>
  );
}
