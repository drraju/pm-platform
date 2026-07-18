"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EmptyState,
  ErrorState,
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
  getPortfolioSummary,
  type ApiPortfolioOverdueTasks,
  type ApiPortfolioProjectAttention,
  type ApiPortfolioSummary,
  type ApiPortfolioUpcomingMilestone,
  type ApiSeverityCounts,
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
    <WorkspaceLayout>
      <WorkspaceHeader
        eyebrow="Portfolio dashboard"
        subtitle="A portfolio-level view of project health across active delivery."
        title="Portfolio"
      />

      <WorkspaceContent>
        {isLoading ? <PortfolioLoadingState /> : null}

        {!isLoading && error ? (
          <ErrorState message={error} title="Unable to load portfolio" />
        ) : null}

        {!isLoading && !error && summary ? (
          <>
            <KPIGrid aria-label="Portfolio summary">
              <SummaryMetricCard
                ariaLabel={`Total Projects: ${summary.totalProjects}`}
                href="/projects"
                title="Total Projects"
                value={summary.totalProjects}
              />
              <SummaryMetricCard
                ariaLabel={`Green Projects: ${summary.greenProjects}`}
                href="/projects?health=GREEN&sort=health_asc"
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

            <OpenRisksBySeverityWidget
              openRisksBySeverity={summary.openRisksBySeverity}
            />

            <OpenIssuesByPriorityWidget
              openIssuesByPriority={summary.openIssuesByPriority}
            />

            <OverdueTasksWidget overdueTasks={summary.overdueTasks} />

            <UpcomingMilestonesWidget
              milestones={summary.upcomingMilestones}
            />

            {summary.totalProjects === 0 ? (
              <EmptyState
                description="No projects are available in the portfolio yet."
                title="Portfolio is empty"
              />
            ) : null}

            {summary.totalProjects > 0 ? (
              <ProjectsRequiringAttentionWidget
                projects={summary.projectsRequiringAttention}
              />
            ) : null}
          </>
        ) : null}
      </WorkspaceContent>
    </WorkspaceLayout>
  );
}

function UpcomingMilestonesWidget({
  milestones,
}: {
  milestones: ApiPortfolioUpcomingMilestone[];
}) {
  return (
    <SummaryCard
      description="Incomplete tasks with the nearest upcoming due dates."
      title="Upcoming Milestones"
    >
      {milestones.length === 0 ? (
        <EmptyState
          as="div"
          compact
          description="No upcoming milestones are currently recorded."
          headingLevel={3}
          title="No upcoming milestones"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3" scope="col">Task Title</th>
                <th className="px-3 py-3" scope="col">Project Name</th>
                <th className="px-3 py-3" scope="col">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {milestones.map((milestone) => (
                <tr key={milestone.taskId}>
                  <td className="px-3 py-3 font-semibold text-slate-950">
                    {milestone.title}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      className="font-medium text-brand hover:underline"
                      href={`/projects/${milestone.projectId}`}
                    >
                      {milestone.projectName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {formatDate(milestone.dueDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SummaryCard>
  );
}

function OverdueTasksWidget({
  overdueTasks,
}: {
  overdueTasks: ApiPortfolioOverdueTasks;
}) {
  return (
    <WorkspaceSection surface="card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-ui-section text-slate-950">Overdue Tasks</h2>
          <p className="mt-1 text-sm text-slate-600">
            Portfolio-wide incomplete tasks past their due date.
          </p>
        </div>
        <SummaryMetricCard
          ariaLabel={`Total Overdue Tasks: ${overdueTasks.total}`}
          className="w-full lg:w-56"
          href="/tasks?scope=all&timing=overdue"
          title="Total Overdue Tasks"
          value={overdueTasks.total}
          variant="critical"
        />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700">
          Projects with Overdue Tasks
        </h3>
        {overdueTasks.projects.length === 0 ? (
          <EmptyState
            as="div"
            className="mt-3"
            compact
            description="No overdue tasks are currently recorded."
            headingLevel={4}
            title="No overdue projects"
          />
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {overdueTasks.projects.map((project) => (
              <Link
                className="flex flex-col gap-2 rounded-md px-3 py-3 text-sm transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                href={`/tasks?scope=all&projectId=${project.projectId}&timing=overdue`}
                key={project.projectId}
              >
                <span className="font-semibold text-slate-950">
                  {project.projectName}
                </span>
                <span className="text-slate-600">
                  {project.overdueTaskCount}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </WorkspaceSection>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function OpenRisksBySeverityWidget({
  openRisksBySeverity,
}: {
  openRisksBySeverity: ApiSeverityCounts;
}) {
  const totalOpenRisks =
    openRisksBySeverity.critical +
    openRisksBySeverity.high +
    openRisksBySeverity.medium +
    openRisksBySeverity.low;

  return (
    <SummaryCard
      description="Open risks grouped by impact severity."
      title="Open Risks by Severity"
    >
      <KPIGrid as="div">
        <SummaryMetricCard
          ariaLabel={`Critical Risks: ${openRisksBySeverity.critical}`}
          href="/risks?severity=critical&status=open"
          title="Critical Risks"
          value={openRisksBySeverity.critical}
          variant="critical"
        />
        <SummaryMetricCard
          ariaLabel={`High Risks: ${openRisksBySeverity.high}`}
          href="/risks?severity=high&status=open"
          title="High Risks"
          value={openRisksBySeverity.high}
          variant="critical"
        />
        <SummaryMetricCard
          ariaLabel={`Medium Risks: ${openRisksBySeverity.medium}`}
          href="/risks?severity=medium&status=open"
          title="Medium Risks"
          value={openRisksBySeverity.medium}
          variant="warning"
        />
        <SummaryMetricCard
          ariaLabel={`Low Risks: ${openRisksBySeverity.low}`}
          href="/risks?severity=low&status=open"
          title="Low Risks"
          value={openRisksBySeverity.low}
          variant="success"
        />
      </KPIGrid>

      {totalOpenRisks === 0 ? (
        <EmptyState
          as="div"
          className="mt-4"
          compact
          description="No open risks are currently recorded."
          headingLevel={3}
          title="No open risks"
        />
      ) : null}
    </SummaryCard>
  );
}

function OpenIssuesByPriorityWidget({
  openIssuesByPriority,
}: {
  openIssuesByPriority: ApiSeverityCounts;
}) {
  const totalOpenIssues =
    openIssuesByPriority.critical +
    openIssuesByPriority.high +
    openIssuesByPriority.medium +
    openIssuesByPriority.low;

  return (
    <SummaryCard
      description="Open issues grouped by delivery priority."
      title="Open Issues by Priority"
    >
      <KPIGrid as="div">
        <SummaryMetricCard
          ariaLabel={`Critical Issues: ${openIssuesByPriority.critical}`}
          href="/issues?priority=critical&status=open"
          title="Critical Issues"
          value={openIssuesByPriority.critical}
          variant="critical"
        />
        <SummaryMetricCard
          ariaLabel={`High Priority Issues: ${openIssuesByPriority.high}`}
          href="/issues?priority=high&status=open"
          title="High Priority Issues"
          value={openIssuesByPriority.high}
          variant="critical"
        />
        <SummaryMetricCard
          ariaLabel={`Medium Priority Issues: ${openIssuesByPriority.medium}`}
          href="/issues?priority=medium&status=open"
          title="Medium Priority Issues"
          value={openIssuesByPriority.medium}
          variant="warning"
        />
        <SummaryMetricCard
          ariaLabel={`Low Priority Issues: ${openIssuesByPriority.low}`}
          href="/issues?priority=low&status=open"
          title="Low Priority Issues"
          value={openIssuesByPriority.low}
          variant="success"
        />
      </KPIGrid>

      {totalOpenIssues === 0 ? (
        <EmptyState
          as="div"
          className="mt-4"
          compact
          description="No open issues are currently recorded."
          headingLevel={3}
          title="No open issues"
        />
      ) : null}
    </SummaryCard>
  );
}

function ProjectsRequiringAttentionWidget({
  projects,
}: {
  projects: ApiPortfolioProjectAttention[];
}) {
  return (
    <SummaryCard
      action={
        <StatusBadge
          aria-label={`${projects.length} projects requiring attention`}
          size="sm"
        >
          {projects.length}
        </StatusBadge>
      }
      description="Amber and red projects across the portfolio."
      title="Projects Requiring Attention"
    >
      {projects.length === 0 ? (
        <EmptyState
          as="div"
          compact
          description="No amber or red projects require attention."
          headingLevel={3}
          title="No projects require attention"
        />
      ) : (
        <div className="divide-y divide-slate-100">
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
                <PortfolioHealthBadge
                  reasons={project.reasons}
                  status={project.healthStatus}
                />
              </div>
              <ProjectHealthReasons reasons={project.reasons} />
            </Link>
          ))}
        </div>
      )}
    </SummaryCard>
  );
}

function PortfolioLoadingState() {
  return (
    <LoadingState
      className="rounded-ui border border-ui-border bg-ui-surface p-5 shadow-ui-subtle"
      label="Loading portfolio"
      rows={4}
    />
  );
}

type PortfolioHealthStatus = ApiPortfolioProjectAttention["healthStatus"];

const portfolioHealthTones: Record<
  PortfolioHealthStatus,
  StatusBadgeTone
> = {
  AMBER: "warning",
  GREEN: "success",
  RED: "critical",
};

function PortfolioHealthBadge({
  reasons,
  status,
}: {
  reasons?: string[];
  status: PortfolioHealthStatus;
}) {
  const formattedStatus = formatHealthStatus(status);

  return (
    <StatusBadge
      description={`Project health status: ${formattedStatus}`}
      dot
      title={formatHealthTooltip(reasons)}
      tone={portfolioHealthTones[status]}
    >
      {formattedStatus}
    </StatusBadge>
  );
}

function formatHealthStatus(status: PortfolioHealthStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatHealthTooltip(reasons?: string[]) {
  return reasons && reasons.length > 0
    ? reasons.join("\n")
    : "No health issues identified";
}
