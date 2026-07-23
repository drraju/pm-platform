# PM Platform v1.1 PRD

## Vision

PM Platform v1.1 advances the Planning Workspace from schedule visualization
into an Enterprise Planning Foundation. It adds calendar architecture, resource
profiles, capacity, availability, allocation, baseline comparison, portfolio
planning signals, and resource overload visibility while preserving the
Scheduling Engine as the single authority for schedule calculations.

The release should make PM Platform credible for project managers who expect
Microsoft Project style planning concepts and portfolio stakeholders who need
resource and schedule visibility across projects.

## Design Principles

- The Scheduling Engine is the single authority for all date calculations.
- All business capabilities are API-first.
- Existing v1.0 behavior must remain backward compatible.
- New functionality should be additive before becoming prescriptive.
- AI capabilities consume planning data rather than replacing scheduling logic.

## Objectives

- Establish the Enterprise Planning Foundation for v1.1.
- Add calendar-aware planning architecture with Enterprise and Project calendars.
- Introduce resource profiles, capacity, availability, and allocation workflows.
- Support resource utilization and over-allocation visibility.
- Improve baseline comparison and variance analysis.
- Expand portfolio visibility with planning-aware signals.
- Preserve existing WBS, Gantt, dependencies, critical path, and RAID workflows.
- Keep implementation incremental and safe for RC1-stabilized behavior.

## Scope

In scope:

- Calendar Framework architecture.
- Enterprise Calendar implementation.
- Project Calendar implementation.
- Resource Calendar inheritance design.
- Resource profile management.
- Resource capacity and availability.
- Resource allocation by project/task/date range.
- Resource utilization and overload visualization.
- Baseline UI and variance views for a single active baseline.
- Portfolio planning schedule and resource summary enhancements.
- Planning Constraints data model and architecture awareness.
- API contracts for calendars, resources, allocations, baselines, planning constraints, and portfolio planning.
- UAT-ready documentation and acceptance criteria.

## Out Of Scope

- Resource Leveling Recommendations.
- Automatic resource leveling.
- Calendar-aware automatic schedule mutation.
- Multiple active baselines.
- Multiple baseline comparison workflows.
- AI-generated project plans.
- Automated cross-project schedule optimization.
- Full earned value management.
- Timesheets.
- Financial budget management.
- Multi-tenant SaaS administration.
- Kubernetes production deployment.
- Full Primavera P6 parity.
- Destructive migration of existing planning data.

## User Personas

| Persona | Goals | v1.1 Needs |
| --- | --- | --- |
| Project Manager | Build and maintain credible schedules. | Calendar Framework, allocations, baselines, variance, resource overload warnings. |
| Resource Manager | Understand capacity and allocation pressure. | Resource profiles, availability, utilization views, over-allocation indicators. |
| PMO Analyst | Enforce planning discipline and reporting consistency. | Baseline comparison, portfolio rollups, schedule health signals. |
| Portfolio Manager | See project demand, milestones, and resource pressure. | Portfolio planning dashboard and cross-project resource summary. |
| Delivery Lead | Coordinate work and dependencies. | Clear resource assignments, workload conflicts, schedule impact. |
| Executive Sponsor | Understand delivery confidence and decisions needed. | Portfolio status, baseline variance, critical resource constraints. |
| Administrator | Maintain users, calendars, and governance data. | Calendar defaults, resource records, permission-aware administration. |

## Functional Requirements

### Calendar Framework

The Calendar Framework has three logical levels:

```text
Enterprise Calendar
  -> Project Calendar
    -> Resource Calendar
```

Rules:

- Enterprise Calendar is the parent calendar.
- Project Calendar inherits Enterprise Calendar defaults.
- Resource Calendar inherits Project Calendar defaults unless overridden.
- Enterprise and Project calendars are required for v1.1 implementation.
- Resource Calendar inheritance architecture should be designed in v1.1 but can be completed later.

Functional requirements:

- Create, view, update, and archive Enterprise Calendars.
- Create, view, update, and archive Project Calendars.
- Configure working days, non-working days, holidays, and exceptions.
- Assign a Project Calendar to a project.
- Use calendar metadata in planning analysis without changing existing scheduling behavior by default.
- Show calendar assignment and calendar exceptions in Planning Workspace or project settings.

### Resource Management

Phase A (v1.1):

- Resource Profiles.
- Capacity.
- Availability.
- Allocation.

Future:

- Skills.
- Competencies.
- Cost Rates.
- Teams.
- Approval Workflows.

Functional requirements:

- Maintain resource profiles linked to users where available.
- Support named non-user resources for future planning.
- Capture role, capacity, status, and default availability.
- Filter and search resources.
- Represent capacity and availability without expanding into skills, cost, team, or approval workflows.

### Resource Allocation

- Allocate resources to projects or planning tasks.
- Capture allocation percentage or effort across a date range.
- Identify allocation conflicts and over-capacity periods.
- Display allocations in project-level and resource-level views.

### Resource Overload Detection

- Detect resource overload from capacity, availability, and allocation data.
- Visualize overloaded resources and date ranges.
- Identify projects or tasks contributing to overload.
- Do not automatically move schedule dates.
- Do not generate Resource Leveling Recommendations in v1.1.
- Record Resource Leveling Recommendations as a future enhancement.

### Baselines

- Show baseline dates alongside current schedule dates.
- Display variance in days.
- Support baseline comparison in Planning Workspace.
- Keep baseline snapshots immutable.
- Support only a single active baseline in v1.1.
- Explicitly defer multiple baselines and multiple baseline comparison workflows.

Future baseline concepts:

- Baseline 1.
- Baseline 2.
- Approved Baseline.
- Forecast Baseline.

### Portfolio Planning

- Add planning-aware portfolio signals.
- Summarize milestones, critical path exposure, baseline variance, and resource pressure.
- Provide drilldowns to affected projects.
- Do not expand portfolio scope into cross-project schedule optimization.

### Planning Constraints

v1.1 should include data model and architecture awareness for future planning
constraints.

Future constraint types:

- Must Start On.
- Must Finish On.
- Start No Earlier Than.
- Finish No Later Than.

v1.1 requirements:

- Define where planning constraints will live in the domain model.
- Ensure API and database design can support future constraints.
- Do not implement scheduling behavior for constraints in v1.1.
- Do not alter Scheduling Engine date calculations for constraints in v1.1.

## Non Functional Requirements

- Scheduling and resource calculations should remain deterministic.
- APIs must enforce project permissions and role-based access.
- Large project plans should remain usable with representative 1,000-task schedules.
- Resource utilization queries should avoid per-row N+1 behavior.
- Calendar calculations should be testable independently.
- Existing v1.0 Planning Workspace workflows must not regress.
- New schema changes should be additive.
- New calculations should be observable through tests and UAT evidence.

## User Stories

| ID | Story |
| --- | --- |
| V11-US-001 | As a Project Manager, I want to assign a Project Calendar so my schedule has a clear calendar context. |
| V11-US-002 | As a Project Manager, I want to see baseline variance so I can explain schedule drift. |
| V11-US-003 | As a Resource Manager, I want to define resource availability so allocation views reflect actual capacity. |
| V11-US-004 | As a Resource Manager, I want to see over-allocated resources so I can rebalance work. |
| V11-US-005 | As a Portfolio Manager, I want portfolio-level schedule and resource indicators so I can identify delivery pressure. |
| V11-US-006 | As a PMO Analyst, I want consistent calendar and baseline rules so reports are explainable. |
| V11-US-007 | As an Executive Sponsor, I want to drill from portfolio risk indicators into the affected project. |
| V11-US-008 | As an Administrator, I want to manage Enterprise Calendar defaults so projects start with consistent planning rules. |

## Acceptance Criteria

- Enterprise Calendars can be created and maintained.
- Project Calendars can be created, inherited from Enterprise defaults, and assigned to projects.
- Resource Calendar inheritance architecture is documented and represented without requiring full v1.1 implementation.
- Resource profiles can be created, edited, filtered, and archived.
- Resource capacity and availability can be represented.
- Resource allocations can be created for projects and planning tasks.
- Resource overload is visible in project and resource views.
- Baseline variance is visible for planning rows with baseline data.
- Only one active baseline is required for v1.1.
- Portfolio dashboard includes planning-aware schedule and resource indicators.
- Planning Constraints are represented in architecture/data model planning only.
- Existing Planning Workspace WBS, Gantt, dependencies, float, and critical path tests remain passing.
- Permission checks prevent unauthorized calendar, resource, allocation, and baseline updates.
- UAT scenarios cover Project Manager, Resource Manager, PMO Analyst, and Portfolio Manager workflows.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Calendar logic changes scheduling behavior unexpectedly. | High | Introduce calendar metadata before enabling calendar-aware date movement. |
| Resource allocation model becomes too complex for v1.1. | High | Start with allocation percentages and date ranges; defer timesheets, skills, cost rates, teams, competencies, and approval workflows. |
| Scheduling Engine becomes tightly coupled to Resource Management. | High | Scheduling Engine remains authoritative. Resource Management consumes schedule outputs rather than changing scheduling algorithms. |
| Portfolio views become slow with cross-project data. | Medium | Use summarized read models and indexed queries. |
| Baseline UI confuses current vs approved dates. | Medium | Use clear labels and read-only baseline semantics. |
| Resource overload detection is mistaken for resource leveling. | Medium | Label v1.1 behavior as overload detection and visualization; record leveling recommendations as future work. |

## Milestones

| Milestone | Outcome |
| --- | --- |
| M1 | Calendar Framework data model and APIs designed. |
| M2 | Enterprise and Project Calendar implementation complete. |
| M3 | Resource profile, capacity, and availability foundation implemented. |
| M4 | Allocation APIs and utilization summaries available. |
| M5 | Single active baseline comparison complete. |
| M6 | Portfolio Planning indicators complete. |
| M7 | UAT and regression validation complete. |

## Success Metrics

- 90%+ UAT pass rate for v1.1 planning scenarios.
- No regression in existing Planning Workspace scheduling workflows.
- Project managers can identify baseline variance without exporting data.
- Resource managers can identify over-allocated resources from the UI.
- Portfolio users can identify projects with schedule and resource pressure.
- Scheduling and allocation APIs meet agreed performance thresholds on representative data.

## Engineering Success Metrics

- Existing Scheduling Engine regression suite remains 100% passing.
- Planning Workspace performance does not regress on representative 1,000-task schedules.
- Backend and frontend automated test suites continue to pass before release.

## PRD Status

Status: Approved for Implementation

Version: v1.1

Approval Date: 2026-07-08

Decision Owner: Ram Datla

Change Control:

Any new feature requests after approval must be added to:

`docs/roadmap/backlog.md`

and not directly into this PRD unless formally approved.
