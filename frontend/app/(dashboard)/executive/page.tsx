"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { PageHeader } from "@/components/layout/page-header";
import {
  ProjectHealthBadge,
  ProjectHealthReasons,
} from "@/components/projects/project-health-badge";
import {
  getAuthMe,
  getStoredPermissionKeys,
  hasPermission,
  storeAuthMe,
} from "@/features/auth";
import {
  getPortfolioSummary,
  type ApiPortfolioProjectAttention,
  type ApiPortfolioSummary,
} from "@/features/portfolio";

export default function ExecutiveDashboardPage() {
  const [summary, setSummary] = useState<ApiPortfolioSummary | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(() =>
    getStoredPermissionKeys(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadExecutiveView() {
      setError(null);
      setIsLoading(true);
      try {
        const [authMe, portfolioSummary] = await Promise.all([
          getAuthMe(),
          getPortfolioSummary(),
        ]);
        storeAuthMe(authMe);
        setPermissionKeys(authMe.permissions.map((permission) => permission.key));
        setSummary(portfolioSummary);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load executive dashboard",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadExecutiveView();
  }, []);

  const canViewExecutive = hasPermission(permissionKeys, "executive.view");

  return (
    <div className="space-y-6">
      <PageHeader
        description="Read-only portfolio reporting for executives across project health, delivery attention, RAID exposure, and upcoming milestones."
        eyebrow="Executive dashboard"
        title="Executive"
      />

      {isLoading ? <ExecutiveLoadingState /> : null}

      {!isLoading && error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {!isLoading && !error && !canViewExecutive ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You do not have permission to view the executive dashboard.
        </section>
      ) : null}

      {!isLoading && !error && canViewExecutive && summary ? (
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

          <section className="grid gap-6 xl:grid-cols-3">
            <SummaryCard
              label="Open Risks"
              tone="danger"
              value={getSeverityTotal(summary.openRisksBySeverity)}
            />
            <SummaryCard
              label="Open Issues"
              tone="warning"
              value={getSeverityTotal(summary.openIssuesByPriority)}
            />
            <SummaryCard
              label="Overdue Tasks"
              tone="danger"
              value={summary.overdueTasks.total}
            />
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-soft">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Projects Requiring Attention
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Read-only executive drill-down into projects with red or amber health.
              </p>
            </div>

            {summary.projectsRequiringAttention.length === 0 ? (
              <p className="mt-5 text-sm text-slate-500">
                No projects currently require executive attention.
              </p>
            ) : (
              <div className="mt-5 divide-y divide-slate-100">
                {summary.projectsRequiringAttention.map((project) => (
                  <AttentionProject key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function ExecutiveLoadingState() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-32 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </section>
      <div className="h-64 animate-pulse rounded-md border border-slate-200 bg-white shadow-soft" />
    </div>
  );
}

function AttentionProject({
  project,
}: {
  project: ApiPortfolioProjectAttention;
}) {
  return (
    <Link
      className="block rounded-md px-3 py-4 text-sm transition hover:bg-slate-50"
      href={`/projects/${project.id}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{project.name}</h3>
          <ProjectHealthReasons reasons={project.reasons} />
        </div>
        <ProjectHealthBadge
          reasons={project.reasons}
          status={project.healthStatus}
        />
      </div>
    </Link>
  );
}

function getSeverityTotal(counts: {
  critical: number;
  high: number;
  medium: number;
  low: number;
}) {
  return counts.critical + counts.high + counts.medium + counts.low;
}
