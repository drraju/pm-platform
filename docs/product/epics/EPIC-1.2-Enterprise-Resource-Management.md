# Epic 1.2: Enterprise Resource Management

## Status

Product and architecture baseline approved. Feature 1.2.1 Enterprise Resource Management Foundation has been implemented and verified. Stage 14 Feature Commit remains pending.

## Business Objective

Create the Enterprise Resource Management foundation needed to model resources, skills, calendars, capacity, assignments, availability, and cost in a way that supports future capacity planning and scheduling integration without destabilizing the current Scheduling Engine.

## Business Value

Enterprise teams need to answer:

- Who is available?
- Who is overallocated?
- Which skills are available for upcoming work?
- Can the portfolio absorb a new project?
- Which resources are assigned to which projects and tasks?
- What capacity remains after committed allocation?

Epic 1.2 turns resource data into a governed product domain instead of treating resource allocation as project-local planning metadata only.

## Vision

Resource Management becomes a first-class bounded context that references users where appropriate, supports non-human resources, and feeds Planning and Portfolio views with reliable capacity and availability signals.

Recommended conceptual chain:

```text
User
  -> Resource Profile
    -> Skills
      -> Calendar
        -> Capacity
          -> Assignments
            -> Cost
```

Users are not resources. A Resource Profile may reference a User, but the system must also support contractors, teams, equipment, facilities, vehicles, and generic resources.

## Problem Statement

The current platform has:

- Users for identity and RBAC.
- Project-scoped planning resource capacity/allocation foundations.
- Resource workload snapshots for heat map style output.

It does not yet have:

- A standalone Resource aggregate.
- Resource profile lifecycle.
- Skills and competencies.
- Resource calendar assignment.
- Resource-specific availability.
- Cost/rate management.
- Cross-project resource search and governance.

## Goals

- Define Resource as a first-class domain model.
- Support human and non-human resource types.
- Link resources to users only where appropriate.
- Capture skills and competencies.
- Assign calendars to resources.
- Manage capacity and availability.
- Assign resources to projects and planning tasks.
- Track cost/rate metadata for future financial views.
- Provide resource list, detail, dashboard, filtering, and search requirements.
- Preserve Scheduling Engine isolation.

## Non Goals

- Do not implement automatic resource leveling.
- Do not mutate schedule dates.
- Do not make Resource the same thing as User.
- Do not implement timesheets.
- Do not implement payroll.
- Do not implement procurement.
- Do not implement full SaaS tenant administration.
- Do not implement AI-generated staffing plans.

## Success Metrics

| Metric | Target |
| --- | --- |
| Resource profile coverage | 95% of active delivery users can be represented as resources. |
| Resource search usability | Users can find resources by name, type, status, skills, team, and availability. |
| Capacity accuracy | Capacity, allocation, and remaining capacity calculations are explainable in tests. |
| Over-allocation visibility | Project and portfolio views can identify overload periods. |
| Scheduling safety | Existing scheduling tests continue to pass with no engine coupling. |
| Performance | Resource list and utilization queries avoid N+1 behavior. |

## Personas

| Persona | Needs |
| --- | --- |
| Project Manager | Assign resources to projects/tasks and understand availability. |
| Portfolio Manager | See resource pressure across projects. |
| PMO | Govern resource data, skills, and reporting consistency. |
| Resource Manager | Maintain capacity, availability, assignments, and over-allocation views. |
| Executive | Understand delivery feasibility and critical resource constraints. |
| Team Lead | See team capacity and project commitments. |
| Developer | Maintain personal profile, skills, and project allocations. |
| Contractor | Be represented as a resource without requiring full employee identity semantics. |

## Dependencies

- Existing Users and RBAC.
- Existing Projects, Tasks, Planning Workspace, and Portfolio views.
- Enterprise Calendar from Epic 1.1.
- Current planning resource capacity/allocation foundations.
- Scheduling Engine isolation rules.
- Future permission model for resource administration.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Resource becomes tightly coupled to User | Blocks contractors, equipment, facilities, generic resources | Resource Profile references User optionally. |
| Capacity model overfits early assumptions | Rework in capacity planning | Use explicit daily/weekly/monthly capacity concepts and clear units. |
| Calendar assignment implies schedule mutation | Scheduling regressions | Calendar assignment is administrative until Planning integration is approved. |
| Resource views expose sensitive availability | Privacy and governance issue | Add resource permissions and visibility rules. |
| Skills become uncontrolled text | Poor search and reporting | Model skill taxonomy and competency levels. |

## Out of Scope

- Scheduling Engine implementation changes.
- Automatic leveling.
- Resource leveling recommendations.
- Calendar-aware working day calculations.
- ICS import/export.
- Timesheets.
- Payroll and billing.
- Multi-tenant SaaS isolation.

## User Stories

| Story | Description | Acceptance Criteria | Priority | Dependencies |
| --- | --- | --- | --- | --- |
| Create Resource | Resource Manager creates a resource profile. | Resource has name, type, status, optional user link, role metadata. | Must | Resource Domain |
| Edit Resource | Resource Manager updates profile metadata. | Changes are validated and audited. | Must | Create Resource |
| Deactivate Resource | Resource Manager archives unavailable resources. | Archived resources no longer appear as active assignment candidates. | Must | Create Resource |
| Assign Calendar | Resource Manager assigns resource calendar context. | Resource shows effective calendar source. | Must | Enterprise Calendar |
| Assign Skills | PMO adds skills and competency levels. | Skills are searchable and editable. | Should | Resource Domain |
| Assign Team | Team Lead groups resources by team. | Team membership appears in list/detail views. | Should | Resource Domain |
| View Capacity | Resource Manager views capacity by day/week/month. | Capacity totals are displayed with units and date range. | Must | Capacity Model |
| View Allocation | Project Manager views project/task assignments. | Allocation rows show resource, percent/effort, dates, project/task. | Must | Planning foundations |
| View Availability | Project Manager sees remaining availability. | Remaining capacity = capacity - allocation for selected period. | Must | Capacity + allocation |
| View Cost | Portfolio Manager views rate/cost metadata. | Cost fields are visible to authorized users only. | Could | Cost model |
| Assign Project | Project Manager assigns resource to project. | Project assignment is permission-checked and auditable. | Must | Project Management |
| Filter Resources | Users filter by type, status, skill, team, availability. | Filters compose and preserve list usability. | Must | Resource API |
| Search Resources | Users search by name, role, skill, team. | Search is performant and permission-aware. | Must | Resource API |
| Bulk Import | PMO imports resources from CSV. | Valid rows import, invalid rows report errors. | Could | Resource API |
| Bulk Export | PMO exports filtered resources. | Export respects permissions and filters. | Could | Resource API |

## Feature Breakdown

### 1.2.1 Resource Domain

| Field | Detail |
| --- | --- |
| Status | Completed. |
| Purpose | Introduce Resource aggregate and lifecycle. |
| Scope | Resource entity, type, status, optional user link, audit, validation, internal service, and persistence migration. |
| Delivered | Resource aggregate, resource persistence, resource validation, internal Resource service, additive database migration. |
| Out of Scope | Public Resource CRUD API, frontend UI, skills, cost, capacity calculations. |
| Dependencies | Users, RBAC, database migration rules. |
| Acceptance Criteria | Resource domain foundation is implemented and verified without scheduling changes. |
| Next Feature | Feature 1.2.2 Resource CRUD API. |

### 1.2.2 Resource CRUD API

| Field | Detail |
| --- | --- |
| Purpose | Expose the Resource aggregate through a governed CRUD API. |
| Scope | Create, read, update, archive, list, and search resources using the existing 1.2.1 Resource aggregate and API boundary conventions. |
| Out of Scope | Full HRIS integration. |
| Dependencies | Resource Domain. |
| Acceptance Criteria | Resource records are visible and editable through API boundaries without changing Scheduling, Planning, or Calendar ownership. |

### 1.2.3 Skills & Competencies

| Field | Detail |
| --- | --- |
| Purpose | Model searchable resource skills. |
| Scope | Skill taxonomy, resource skills, competency level, optional certification metadata. |
| Out of Scope | AI skill inference. |
| Dependencies | Resource CRUD API. |
| Acceptance Criteria | Resources can be filtered by skill and competency. |

### 1.2.4 Calendar Assignment

| Field | Detail |
| --- | --- |
| Purpose | Associate resources with calendar context. |
| Scope | Resource calendar assignment and effective calendar source metadata. |
| Out of Scope | Schedule date calculation. |
| Dependencies | Enterprise Calendar, future Project Calendar. |
| Acceptance Criteria | Resource can show assigned/effective calendar without changing schedules. |

### 1.2.5 Capacity Management

| Field | Detail |
| --- | --- |
| Purpose | Represent resource capacity and availability. |
| Scope | Daily, weekly, monthly capacity; availability; remaining capacity. |
| Out of Scope | Automatic leveling. |
| Dependencies | Resource CRUD API, Calendar Assignment. |
| Acceptance Criteria | Capacity and remaining availability can be queried and tested. |

### 1.2.6 Project Assignment

| Field | Detail |
| --- | --- |
| Purpose | Assign resources to projects/tasks. |
| Scope | Project and task assignments, allocation percent/effort, date range. |
| Out of Scope | Schedule mutation. |
| Dependencies | Projects, Tasks, Planning foundations. |
| Acceptance Criteria | Allocation CRUD works and respects project visibility. |

### 1.2.7 Cost & Rates

| Field | Detail |
| --- | --- |
| Purpose | Capture cost/rate metadata for future portfolio planning. |
| Scope | Standard rate, cost rate, currency, effective dates, visibility controls. |
| Out of Scope | Payroll, billing, invoicing. |
| Dependencies | Resource CRUD API, Security. |

## Architecture References

- Epic architecture baseline: [ERM Architecture Design Document](../../architecture/ERM_ARCHITECTURE_DESIGN_DOCUMENT.md)
- Feature 1.2.2 ADD: [Feature 1.2.2 Resource CRUD API ADD](../../architecture/FEATURE_1.2.2_RESOURCE_CRUD_API_ADD.md)
- Feature tracking: [Feature Progress](../../FEATURE_PROGRESS.md)
| Acceptance Criteria | Authorized users can maintain rates without exposing them broadly. |

### 1.2.8 Resource Dashboard

| Field | Detail |
| --- | --- |
| Purpose | Provide resource management UI and summaries. |
| Scope | Resource list, filters, detail, capacity/availability/allocation summary. |
| Out of Scope | Gantt, drag/drop leveling. |
| Dependencies | Resource APIs, frontend feature structure. |
| Acceptance Criteria | Resource Manager can find resources and identify overload/availability. |

## Definition of Done

- Product and architecture docs approved.
- Resource ADD approved before code implementation.
- Database changes are additive.
- Backend APIs have DTOs, validation, Swagger, permission checks, and tests.
- Frontend follows feature architecture and has Vitest coverage.
- Scheduling Engine remains unchanged unless explicitly approved in a later epic.
- Docker and Ubuntu verification pass for implementation features.
