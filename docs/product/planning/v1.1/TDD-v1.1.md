# PM Platform v1.1 Technical Design

## Overview

v1.1 extends the current Planning Workspace and Scheduling Engine with calendar,
resource, baseline, and portfolio planning capabilities. The design is additive,
permission-aware, API-first, and aligned with existing NestJS modules, DTO
validation, TypeORM entities, Next.js UI patterns, and Planning Workspace
read-model projection.

The Scheduling Engine remains the single authority for date calculations. New
calendar, resource, allocation, baseline, and portfolio capabilities must
provide context and read models around the engine rather than replacing or
coupling directly into scheduling algorithms.

## Architecture Overview

Logical flow:

```text
Enterprise Planning UI
        |
        v
REST APIs
        |
        v
Planning Services
        |
        v
Scheduling Context
        |
        v
Scheduling Engine
        |
        v
Planning Snapshot
        |
        v
Planning Workspace
        |
        v
Portfolio Planning
        |
        v
Future AI Services
```

Layer responsibilities:

| Layer | Responsibility |
| --- | --- |
| Enterprise Planning UI | Presents calendars, resources, allocations, baselines, overloads, portfolio indicators, and planning controls. |
| REST APIs | Expose business capabilities through permission-aware, DTO-validated contracts. |
| Planning Services | Own project-scoped planning workflows, validation, persistence orchestration, and read-model assembly. |
| Scheduling Context | Adapts calendars, constraints, resource availability, and future scheduling extensions into engine-safe inputs. |
| Scheduling Engine | Calculates schedule dates, float, and critical path from validated planning inputs. |
| Planning Snapshot | Preserves the current planning read model and regenerated workspace state. |
| Planning Workspace | Displays WBS, Gantt, scheduling analysis, baselines, allocations, and overload indicators. |
| Portfolio Planning | Consumes summarized project planning read models for cross-project visibility. |
| Future AI Services | Consume planning APIs and read models to explain, summarize, and recommend without directly mutating scheduling tables. |

## Calendar Framework

### Purpose

Define a calendar hierarchy that supports enterprise defaults, project-specific
planning rules, and future resource-specific overrides without disrupting
existing v1.0 schedule behavior.

### Architecture

Calendar hierarchy:

```text
Enterprise Calendar
        |
        v
Project Calendar
        |
        v
Resource Calendar
```

Inheritance precedence:

```text
Resource Exception
        |
        v
Resource Calendar
        |
        v
Project Calendar
        |
        v
Enterprise Calendar
```

Rules:

- Enterprise Calendar is the parent calendar for organization-wide defaults.
- Project Calendar inherits Enterprise Calendar defaults and can override working days, holidays, and exceptions.
- Resource Calendar inherits Project Calendar defaults unless overridden by resource-specific availability.
- Resource Exceptions override Resource Calendar rules for specific dates or periods.
- Enterprise and Project calendars are implemented in v1.1.
- Resource inheritance is architected in v1.1 for future completion.

### Database Changes

- Add Enterprise Calendar entity.
- Add Project Calendar entity.
- Add calendar exception entity.
- Add project-to-calendar relationship.
- Preserve existing schedule dates.
- Reserve future relationship points for Resource Calendar inheritance.

### REST APIs

- CRUD Enterprise Calendars.
- CRUD Project Calendars.
- Manage Enterprise and Project calendar exceptions.
- Assign Project Calendar to project.
- Read effective calendar for a project.

### Frontend Components

- Enterprise Calendar administration screen.
- Project Calendar settings screen.
- Working week editor.
- Holiday and exception list.
- Assign calendar dialog.
- Calendar inheritance indicator.

### Scheduling Engine Impact

- Scheduling Engine consumes calendar data only through Scheduling Context.
- Keep current duration offsets as default.
- Do not implement calendar-aware automatic date movement in v1.1.
- Later working-day conversion must enter through Scheduling Context.

### Testing Strategy

- Unit tests for inheritance resolution.
- Unit tests for working day and exception calculations.
- Integration tests for Enterprise and Project calendar CRUD.
- Integration tests for project calendar assignment.
- Regression tests confirming existing schedule output remains stable when calendar-aware calculation is disabled.

### Migration Strategy

- Add default Enterprise Calendar without changing existing project schedule dates.
- Add Project Calendar assignment as optional.
- Backfill project calendar references only after read behavior is validated.

## Scheduling Context

### Purpose

Prevent the Scheduling Engine from depending directly on database entities.

Scheduling Context is an adapter layer that converts persisted planning,
calendar, constraint, and future resource data into stable engine inputs.

### Architecture

Scheduling Context should provide:

- Calendar information.
- Planning Constraints.
- Resource Availability.
- Future scheduling extensions.

The Scheduling Engine consumes Scheduling Context rather than calendar tables,
resource tables, or TypeORM entities directly.

### Database Changes

- No dedicated Scheduling Context table is required.
- Context is assembled from planning snapshots, calendar records, constraints, and resource availability read models.

### REST APIs

- No public Scheduling Context API is required in v1.1.
- Internal services may expose context-building methods.

### Frontend Components

- None directly.
- UI sees Scheduling Context effects through Planning Workspace read models and analysis fields.

### Scheduling Engine Impact

- Engine input remains deterministic and decoupled from persistence.
- Calendar, constraint, and resource changes become explicit context changes.
- Engine tests can construct Scheduling Context without database setup.

### Testing Strategy

- Unit tests for context assembly.
- Contract tests for engine-safe context shape.
- Regression tests proving engine does not import persistence entities.

### Migration Strategy

- Introduce Scheduling Context as an internal service boundary.
- Route new calendar/constraint/resource metadata through the context layer.
- Avoid changing engine algorithms until context inputs are proven.

## Resource Calendars

### Purpose

Represent resource availability architecture without requiring full Resource
Calendar implementation in v1.1.

### Architecture

- Resource Calendar inherits Project Calendar defaults.
- Resource Exceptions override Resource Calendar availability.
- Resource availability should be exposed through Scheduling Context in future releases.
- v1.1 designs the inheritance contract but does not require complete Resource Calendar UI or scheduling behavior.

### Database Changes

- Reserve future Resource Calendar relationship design.
- Implement only fields needed for v1.1 capacity and availability if required by Resource Management.

### REST APIs

- Defer full Resource Calendar CRUD unless needed for v1.1 capacity/availability.
- Prefer effective availability read APIs over exposing incomplete calendar editing workflows.

### Frontend Components

- Resource availability summary.
- Calendar inheritance indicator.
- Full resource calendar editor is future scope.

### Scheduling Engine Impact

- No direct schedule date movement in v1.1.
- Future resource availability enters through Scheduling Context.

### Testing Strategy

- Unit tests for planned inheritance rules.
- Utilization tests for availability summaries.

### Migration Strategy

- Existing users receive default availability.
- Missing resource calendar data falls back to Project Calendar then Enterprise Calendar.

## Resource Management

### Purpose

Create a planning-ready resource model for people and named resources.

### Architecture

- Add Resource service.
- User-linked resources represent internal team members.
- Named resources support placeholders such as vendor, team, or role capacity.
- Resource status controls planning availability.
- v1.1 includes Resource Profiles, Capacity, Availability, and Allocation.
- Skills, competencies, cost rates, teams, and approval workflows remain future scope.

### Database Changes

- Add resource entity.
- Optional user relationship.
- Role, status, default capacity, default availability.

### REST APIs

- List resources.
- Create resource.
- Update resource.
- Archive resource.
- Search/filter resources.

### Frontend Components

- Resources list.
- Resource detail panel.
- Resource form.
- Resource filters.

### Scheduling Engine Impact

- Resource Management does not alter Scheduling Engine algorithms.
- Resource data feeds Resource Analysis and future Scheduling Context extensions.

### Testing Strategy

- Unit tests for resource validation.
- Integration tests for permissions and CRUD.
- Frontend component tests for list, form, and filters.

### Migration Strategy

- Create resource records from project members or users only when explicitly enabled.
- Avoid destructive user model changes.

## Resource Allocation

### Purpose

Assign resource demand to projects and planning tasks across dates.

### Architecture

- Allocation service validates resource, project, optional task, date range, allocation source, and allocation percentage.
- Allocation summary service aggregates capacity vs demand.
- Planning Workspace reads allocation indicators but does not own calculation logic.
- Allocation calculations remain independent of scheduling calculations.

Allocation Source values:

- Manual.
- Planning Task.
- Import.
- Future AI.

### Database Changes

- Add resource allocation entity.
- Link to resource.
- Link to project.
- Optional link to planning task schedule or project task.
- Store allocation date range, percentage, effort, status, and allocation source.

### REST APIs

- CRUD allocations.
- List allocations by project.
- List allocations by resource.
- Read utilization summary.
- Read over-allocation summary.

### Frontend Components

- Project Resource Allocation panel.
- Resource utilization grid.
- Allocation create/edit dialog.
- Over-allocation badges.
- Allocation source indicator.

### Scheduling Engine Impact

- No critical path or date calculation impact.
- Uses schedule date ranges only to contextualize allocation demand.
- Scheduling Engine remains authoritative for schedule dates.

### Testing Strategy

- Unit tests for overlapping allocations.
- Unit tests for allocation source validation.
- Integration tests for utilization summaries.
- Performance tests for 100+ resources and 500+ allocations.

### Migration Strategy

- Add allocation tables empty.
- Allow manual allocation creation before automated task-derived allocation.
- Treat imported and AI-generated allocation sources as future-compatible metadata.

## Resource Analysis Service

### Purpose

Analyze capacity, availability, allocation, and schedule context to expose
resource pressure without moving schedule dates.

### Architecture

Resource Analysis Service responsibilities:

- Detect overload.
- Detect under-utilization.
- Detect idle capacity.
- Detect conflicts.

Future:

- Resource Leveling Recommendations.
- Automatic Leveling.
- Scenario Planning.

No automatic schedule movement occurs in v1.1.

### Database Changes

- Add optional resource analysis snapshot only if query cost requires caching.
- Do not add leveling recommendation persistence in v1.1 unless explicitly approved later.

### REST APIs

- Read resource overload summary.
- Read resource utilization summary.
- Read idle capacity summary.
- Read resource conflict summary.

### Frontend Components

- Resource pressure panel.
- Resource conflict drawer.
- Overload and idle-capacity indicators.
- Utilization grid.

### Scheduling Engine Impact

- Consumes Scheduling Engine outputs such as dates, float, and critical flags.
- Does not change Scheduling Engine algorithms.
- Does not mutate Planning Snapshot schedule dates.

### Testing Strategy

- Unit tests for overload detection.
- Unit tests for under-utilization and idle capacity.
- Integration tests for resource conflict summaries.
- UAT tests for clarity of overload visualization.

### Migration Strategy

- Ship analysis and visualization first.
- Defer Resource Leveling Recommendations, Automatic Leveling, and Scenario Planning.

## Baselines

### Purpose

Improve baseline visibility and variance analysis in Planning Workspace and reporting.

### Architecture

- Existing baseline model remains immutable.
- Baseline Comparison Service compares baseline records against current schedule read models.
- Baseline Comparison Service calculates variance.
- Baseline Comparison Service preserves immutable baseline records.
- Comparison logic must not move into baseline entities.
- UI overlays baseline dates and variance columns.

### Database Changes

- Prefer using existing baseline entities where possible.
- Add comparison preference metadata only if existing fields are insufficient.
- Keep baseline records immutable.

### REST APIs

- List baselines.
- Get baseline detail.
- Compare active baseline to current plan.
- Mark one baseline as active comparison baseline.

### Frontend Components

- Baseline selector.
- Baseline comparison columns.
- Variance indicators.
- Baseline detail dialog.

### Scheduling Engine Impact

- No recalculation ownership.
- Uses current schedule analysis values for variance context.

### Testing Strategy

- Unit tests for variance calculation.
- Unit tests proving baseline records are not mutated by comparison.
- Integration tests for immutable baseline readback.
- Frontend tests for selector and variance display.

### Migration Strategy

- Preserve existing baselines.
- Add comparison views without changing baseline capture semantics.
- Require only one active baseline in v1.1.

## Portfolio Planning

### Purpose

Expose planning-aware portfolio signals for schedule health, milestones,
baseline variance, and resource pressure.

### Architecture

Preferred flow:

```text
Planning Snapshot
        |
        v
Planning Summary
        |
        v
Portfolio Planning
```

- Portfolio consumes summarized planning read models.
- Portfolio must never query raw planning task data directly where summarized read models exist.
- Portfolio service consumes project schedule summaries, baseline comparisons, and allocation summaries.
- Drilldowns route back to project-level planning evidence.

### Database Changes

- Prefer computed planning summaries.
- Add portfolio summary snapshot only if query cost becomes high.

### REST APIs

- Portfolio planning summary.
- Portfolio milestone summary.
- Portfolio resource pressure summary.
- Portfolio baseline variance summary.

### Frontend Components

- Portfolio planning widgets.
- Resource pressure card.
- Baseline variance card.
- Milestone drilldown table.

### Scheduling Engine Impact

- Consumes summarized project-level ScheduleAnalysis outputs.
- Does not recalculate schedules across projects in v1.1.

### Testing Strategy

- Service tests for aggregation.
- Permission tests for project visibility.
- Tests proving hidden project data is excluded.
- Frontend tests for drilldowns.

### Migration Strategy

- Add portfolio summaries behind existing visibility rules.
- Keep project-scoped data authoritative.

## Cross-Cutting Services

Every v1.1 module should integrate with platform-wide services.

| Service | Responsibility |
| --- | --- |
| Authorization | Enforce project visibility, resource visibility, and update permissions. |
| Audit Logging | Record important calendar, resource, allocation, baseline, and portfolio summary actions. |
| Notifications | Support future alerts for overloads, baseline variance, and planning changes. |
| Search | Make resources, projects, and portfolio planning records discoverable. |
| Caching | Cache expensive summaries where calculation cost is high. |
| Observability | Emit logs, metrics, and traces for planning calculations and API workflows. |
| Background Jobs | Support future async utilization, portfolio summary, and snapshot recalculation workflows. |
| Validation | Centralize DTO, domain, dependency, calendar, allocation, and permission validation. |

## Domain Events

The following are architectural domain events. No event bus implementation is
required in v1.1.

Planned event examples:

- CalendarAssigned.
- CalendarUpdated.
- ResourceCreated.
- ResourceAllocated.
- AllocationUpdated.
- BaselineCreated.
- BaselineCompared.
- PlanningSnapshotRegenerated.
- PortfolioSummaryUpdated.

Event usage:

- Audit logging.
- Future notifications.
- Future background jobs.
- Future AI context generation.
- Future integration workflows.

## Future AI Architecture

Future AI Services consume:

- Planning Snapshot.
- Schedule Analysis.
- Resource Analysis.
- Portfolio Summary.
- Baselines.
- Calendars.

Architecture rules:

- AI Services interact through APIs and read models.
- AI Services must never modify scheduling tables directly.
- AI-generated outputs must remain recommendations until a user explicitly approves an action.
- AI must consume Scheduling Engine outputs rather than replacing scheduling logic.
- AI must respect authorization and project visibility boundaries.

## TDD Status

Status: Approved for Implementation

Version: v1.1

Approval Date: 2026-07-08

Decision Owner: Ram Datla

Architecture Review Board:

Approved for implementation following final refinement.

Future architectural changes require either:

- ADR
- TDD revision
