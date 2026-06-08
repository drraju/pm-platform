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
import { useAuthorization } from "@/features/auth";
import {
  getExecutiveSummary,
  type ApiExecutiveSummary,
  type ApiPortfolioProjectAttention,
} from "@/features/executive";

export default function ExecutiveDashboardPage() {
  const authorization = useAuthorization(["executive:summary:read"]);
  const [summary, setSummary] = useState<ApiExecutiveSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadExecutiveSummary() {
      if (authorization.isLoading) {
        return;
      }
      if (!authorization.isAuthorized) {
        setIsLoading(false);
        return;
      }

      setError(null);
      setIsLoading(true);
      try {
        setSummary(await getExecutiveSummary());
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load executive summary",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadExecutiveSummary();
  }, [authorization.isAuthorized, authorization.isLoading]);

  return (
    <div className="space-y-6">
      <PageHeader
        description="A single executive view of portfolio health, delivery pressure, and governance exposure."
        eyebrow="Executive dashboard"
        title="Executive Dashboard"
      />

      {authorization.isLoading || isLoading ? <ExecutiveLoadingState /> : null}

      {!authorization.isLoading && !authorization.isAuthorized ? (
        <AuthorizationError
          message={
            authorization.error ??
            "You do not have permission to view the Executive Dashboard."
          }
        />
      ) : null}

      {!authorization.isLoading && authorization.isAuthorized && !isLoading && error ? (
        <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {!authorization.isLoading && authorization.isAuthorized && !isLoading && !error && summary ? (
        <>
          <MetricSection
            description="Current project health distribution across the full portfolio."
            title="Portfolio Health"
          >
            <SummaryCard
              label="Total Projects"
              value={summary.portfolioHealth.totalProjects}
            />
            <SummaryCard
              label="Green Projects"
              tone="success"
              value={summary.portfolioHealth.greenProjects}
            />
            <SummaryCard
              label="Amber Projects"
              tone="warning"
              value={summary.portfolioHealth.amberProjects}
            />
            <SummaryCard
              label="Red Projects"
              tone="danger"
              value={summary.portfolioHealth.redProjects}
            />
          </MetricSection>

          <div className="grid gap-6 xl:grid-cols-2">
            <MetricSection
              columns="two"
              description="Portfolio-wide delivery commitments requiring leadership visibility."
              title="Delivery"
            >
              <SummaryCard
                label="Overdue Tasks"
                tone={summary.delivery.overdueTasks > 0 ? "danger" : "default"}
                value={summary.delivery.overdueTasks}
              />
              <SummaryCard
                label="Upcoming Milestones"
                value={summary.delivery.upcomingMilestones}
              />
            </MetricSection>

            <MetricSection
              columns="two"
              description="Open risk and issue load across active projects."
              title="Governance"
            >
              <SummaryCard
                label="Open Risks"
                tone={summary.governance.openRisks > 0 ? "warning" : "default"}
                value={summary.governance.openRisks}
              />
              <SummaryCard
                label="Open Issues"
                tone={summary.governance.openIssues > 0 ? "danger" : "default"}
                value={summary.governance.openIssues}
              />
            </MetricSection>
          </div>

          {summary.portfolioHealth.totalProjects === 0 ? (
            <section className="rounded-md border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-soft">
              No projects are available for executive reporting yet.
            </section>
          ) : null}

          <ProjectsRequiringAttentionWidget
            projects={summary.projectsRequiringAttention}
          />
        </>
      ) : null}
    </div>
  );
}

function AuthorizationError({ message }: { message: string }) {
  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
      <h2 className="font-semibold">Access denied</h2>
      <p className="mt-1">{message}</p>
    </section>
  );
}

function MetricSection({
  children,
  columns = "four",
  description,
  title,
}: {
  children: React.ReactNode;
  columns?: "four" | "two";
  description: string;
  title: string;
}) {
  const gridClass =
    columns === "two"
      ? "grid gap-4 sm:grid-cols-2"
      : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className={gridClass}>{children}</div>
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Projects Requiring Attention
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Amber and red projects with health reasons surfaced for review.
          </p>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
          {projects.length}
        </span>
      </div>

      {projects.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          No projects currently require executive attention.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {projects.map((project) => (
            <div
              className="grid gap-3 px-1 py-4 md:grid-cols-[minmax(0,1fr)_auto]"
              key={project.id}
            >
              <div className="min-w-0">
                <Link
                  className="font-semibold text-slate-950 transition hover:text-brand hover:underline"
                  href={`/projects/${project.id}`}
                >
                  {project.name}
                </Link>
                <ProjectHealthReasons reasons={project.reasons} />
              </div>
              <ProjectHealthBadge
                reasons={project.reasons}
                status={project.healthStatus}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ExecutiveLoadingState() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-28 animate-pulse rounded-md border border-slate-200 bg-slate-100"
            key={index}
          />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            className="h-44 animate-pulse rounded-md border border-slate-200 bg-slate-100"
            key={index}
          />
        ))}
      </section>
      <div className="h-56 animate-pulse rounded-md border border-slate-200 bg-slate-100" />
    </div>
  );
}
