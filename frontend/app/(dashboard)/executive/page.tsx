"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  EmptyState,
  ErrorState,
  InfoCard,
  KPIGrid,
  LoadingState,
  StatusBadge,
  SummaryCard,
  SummaryMetricCard,
  WorkspaceContent,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceSection,
  type StatusBadgeTone,
} from "@/components/foundation";
import { ProjectHealthReasons } from "@/components/projects/project-health-badge";
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
    <WorkspaceLayout>
      <WorkspaceHeader
        eyebrow="Executive dashboard"
        subtitle="Read-only portfolio reporting for executives across project health, delivery attention, RAID exposure, and upcoming milestones."
        title="Executive"
      />

      <WorkspaceContent>
        {isLoading ? <ExecutiveLoadingState /> : null}

        {!isLoading && error ? (
          <ErrorState
            message={error}
            title="Unable to load executive dashboard"
          />
        ) : null}

        {!isLoading && !error && !canViewExecutive ? (
          <InfoCard
            as="section"
            headingLevel={2}
            title="Executive dashboard unavailable"
            tone="warning"
          >
            You do not have permission to view the executive dashboard.
          </InfoCard>
        ) : null}

        {!isLoading && !error && canViewExecutive && summary ? (
          <>
            <KPIGrid aria-label="Portfolio health summary">
              <SummaryMetricCard
                ariaLabel={`Total Projects: ${summary.totalProjects}`}
                href="/projects"
                title="Total Projects"
                value={summary.totalProjects}
              />
              <SummaryMetricCard
                ariaLabel={`Green Projects: ${summary.greenProjects}`}
                href="/projects?health=GREEN"
                title="Green Projects"
                value={summary.greenProjects}
                variant="success"
              />
              <SummaryMetricCard
                ariaLabel={`Amber Projects: ${summary.amberProjects}`}
                href="/projects?health=AMBER&sort=health_desc"
                title="Amber Projects"
                value={summary.amberProjects}
                variant="warning"
              />
              <SummaryMetricCard
                ariaLabel={`Red Projects: ${summary.redProjects}`}
                href="/projects?health=RED&sort=health_desc"
                title="Red Projects"
                value={summary.redProjects}
                variant="critical"
              />
            </KPIGrid>

            <WorkspaceSection
              aria-label="Delivery attention summary"
              className="grid gap-6 xl:grid-cols-3"
              padding="none"
            >
              <SummaryMetricCard
                ariaLabel={`Open Risks: ${getSeverityTotal(summary.openRisksBySeverity)}`}
                href="/risks?status=open"
                title="Open Risks"
                value={getSeverityTotal(summary.openRisksBySeverity)}
                variant="critical"
              />
              <SummaryMetricCard
                ariaLabel={`Open Issues: ${getSeverityTotal(summary.openIssuesByPriority)}`}
                href="/issues?status=open"
                title="Open Issues"
                value={getSeverityTotal(summary.openIssuesByPriority)}
                variant="warning"
              />
              <SummaryMetricCard
                ariaLabel={`Overdue Tasks: ${summary.overdueTasks.total}`}
                href="/tasks?scope=all&timing=overdue"
                title="Overdue Tasks"
                value={summary.overdueTasks.total}
                variant="critical"
              />
            </WorkspaceSection>

            <SummaryCard
              description="Read-only executive drill-down into projects with red or amber health."
              title="Projects Requiring Attention"
            >
              {summary.projectsRequiringAttention.length === 0 ? (
                <EmptyState
                  as="div"
                  compact
                  description="No projects currently require executive attention."
                  headingLevel={3}
                  title="No projects require attention"
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {summary.projectsRequiringAttention.map((project) => (
                    <AttentionProject key={project.id} project={project} />
                  ))}
                </div>
              )}
            </SummaryCard>
          </>
        ) : null}
      </WorkspaceContent>
    </WorkspaceLayout>
  );
}

function ExecutiveLoadingState() {
  return (
    <LoadingState
      className="rounded-ui border border-ui-border bg-ui-surface p-5 shadow-ui-subtle"
      label="Loading executive dashboard"
      rows={6}
    />
  );
}

type ExecutiveHealthStatus = ApiPortfolioProjectAttention["healthStatus"];

const executiveHealthTones: Record<
  ExecutiveHealthStatus,
  StatusBadgeTone
> = {
  AMBER: "warning",
  GREEN: "success",
  RED: "critical",
};

function ExecutiveHealthBadge({
  reasons,
  status,
}: {
  reasons?: string[];
  status: ExecutiveHealthStatus;
}) {
  const description =
    reasons && reasons.length > 0
      ? reasons.join(". ")
      : "No health issues identified";

  return (
    <StatusBadge
      description={description}
      dot
      title={description}
      tone={executiveHealthTones[status]}
    >
      {formatHealthStatus(status)}
    </StatusBadge>
  );
}

function formatHealthStatus(status: ExecutiveHealthStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
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
        <ExecutiveHealthBadge
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
