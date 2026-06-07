# Release Roadmap

## Completed Releases

### v0.1 Working Platform

Delivered:

- NestJS backend application.
- Next.js frontend application.
- PostgreSQL persistence through TypeORM.
- Docker deployment foundation with PostgreSQL, Redis, MinIO, backend, and frontend.
- Authentication foundation with login and register flows.

### v0.2 Core PM

Delivered:

- Project CRUD APIs.
- Project list page.
- Project workspace route.
- Project membership APIs.
- Project-scoped task APIs.
- Authenticated My Tasks view and summary APIs.
- Application shell with navigation and responsive layout.

### v0.3 RAID Management

Delivered:

- RAID entities for risks, assumptions, issues, and dependencies.
- RAID create/list APIs.
- Project-scoped RAID collection APIs.
- Project workspace sections for Risks, Issues, Assumptions, and Dependencies.
- Standalone Risks and Issues frontend pages.

### v0.4 Project Health

Delivered:

- `ProjectHealthService`.
- Health statuses: `GREEN`, `AMBER`, `RED`.
- Health reasons.
- Health exposed through Projects, Dashboard, and Portfolio flows.
- Health badges and project health card UI.

### v0.5 Portfolio Risk Summary

Delivered:

- Portfolio module and `GET /portfolio/summary`.
- Portfolio health counts.
- Projects requiring attention.
- Open Risks by Severity widget.
- Open risk aggregation by `Risk.impact`.

### v0.6 Portfolio Issue Summary

Delivered:

- Open Issues by Priority summary in `GET /portfolio/summary`.
- Issue aggregation by `Issue.severity`.
- Open Issues by Priority portfolio widget.

## Planned Releases

### v0.7 Portfolio Overdue Tasks

Scope:

- Portfolio-wide overdue task reporting.
- Total overdue task count.
- Project-level overdue task breakdown.
- Links from overdue project rows to project workspace.

Current implementation status:

- Backend DTO, service aggregation, Swagger coverage, and frontend widget are implemented in the current working tree.
- This release should be finalized through product review and regression testing before being marked completed.

### v0.8 Upcoming Milestones

Scope:

- Milestone model or milestone-compatible task classification.
- Portfolio upcoming milestone view.
- Project workspace milestone section.
- Alerts for milestone drift.

### v0.9 Executive Dashboard

Scope:

- Executive dashboard route with portfolio KPIs.
- Delivery health trends.
- RAID trend summary.
- Overdue and upcoming milestone summary.
- Executive-friendly visual hierarchy.

### v1.0 PM Platform MVP

Scope:

- Hardened authentication and authorization.
- Stable project, task, RAID, dashboard, and portfolio flows.
- Production deployment checklist.
- Migration strategy.
- MVP-level documentation and smoke tests.

### v1.1 Timeline / Gantt

Scope:

- Timeline/Gantt route implementation.
- Task dependency visualization.
- Date range and critical path views.
- Project schedule baseline support.

### v1.2 Resource Capacity Planning

Scope:

- Resource assignment and capacity views.
- Workload by person and project.
- Capacity warnings for over-allocation.
- Portfolio-level demand view.

### v1.3 Program Management

Scope:

- Program entity and program-to-project relationships.
- Program dashboard.
- Program-level RAID and dependency rollups.
- Program manager workflows.

### v1.4 Cross-Project Dependencies

Scope:

- Structured dependency links between projects.
- Dependency owner, status, and due dates.
- Cross-project dependency map.
- Portfolio dependency risk indicators.

### v1.5 AI Insights

Scope:

- AI-generated delivery insights.
- Health reason summarization.
- Risk and issue trend analysis.
- Suggested next actions for project managers and portfolio leaders.

## Release Principles

- Keep domain logic in backend services.
- Keep health and portfolio calculations centralized and reusable.
- Use DTOs for API contracts.
- Keep frontend pages composed from reusable widgets.
- Add tests for each release increment.
- Preserve Docker deployability.
