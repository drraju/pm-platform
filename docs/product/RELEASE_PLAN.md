# Release Plan

This release plan maps Enterprise Resource Management features to the approved roadmap.

## Release Map

| Release | Theme | Features |
| --- | --- | --- |
| v1.2 | Enterprise Resource Management | Resource Domain, Profiles, Types, Status, Search, Capacity Model, Assignments, initial dashboard. |
| v1.3 | Scheduling Engine Integration | Calendar/resource context design, Planning integration, project resource panel, baseline/resource context. |
| v1.4 | Gantt | Gantt resource overlays, assignment visibility, schedule/resource visualization. |
| v1.5 | Capacity Planning | Utilization summaries, over-allocation indicators, remaining capacity, forecasting. |
| v2 | AI Project Manager | AI resource summaries, staffing suggestions, risk narratives, no scheduling authority. |

## v1.2 Scope

Must deliver:

- Resource aggregate.
- Resource CRUD API.
- Resource management UI.
- Resource types.
- Optional user link.
- Resource status lifecycle.
- Capacity model.
- Assignment model aligned with existing planning foundations.
- Permission and visibility design.

Should deliver:

- Skills and competencies.
- Calendar assignment metadata.
- Resource detail dashboard.

## v1.2 Implementation Status

| Feature | Status | Validation |
| --- | --- | --- |
| 1.2.1 Enterprise Resource Management Foundation | Completed | Implementation, implementation review, testing, Docker verification, and Ubuntu verification completed. |
| 1.2.2 Resource CRUD API | Completed | Implementation, implementation alignment, implementation review, testing, Docker verification, Docker runtime alignment, and Ubuntu verification completed. |
| 1.2.3 Resource Assignment | Completed | Domain, persistence, validation, application service, REST API, testing, Docker verification, Ubuntu verification, and release readiness completed. |
| 1.2.4 Skills Management | Planned | Not started. Preserved as a later ERM feature after Resource Assignment. |

Feature 1.2.1 delivers the Resource aggregate, resource persistence, resource validation, internal Resource service, and additive database migration. Public Resource CRUD APIs were delivered in Feature 1.2.2.

Feature 1.2.2 delivers the public Resource CRUD API boundary, Resource controller, DTOs, mapper, API service orchestration, ERM Resource permissions, Swagger documentation, and backend test coverage. Release readiness for the implemented API surface has been verified in Docker and Ubuntu-style deployment checks.

## v1.3 Scope

- Approved integration between Resource Management, Calendar, Planning, and SchedulingContext.
- Project resource allocation panel.
- Calendar/resource context in planning analysis where approved.
- No automatic leveling unless a separate ADR/ADD approves it.

## v1.4 Scope

- Gantt enhancements.
- Resource assignment visibility in timeline/Gantt surfaces.
- No drag/drop resource leveling unless separately approved.

## v1.5 Scope

- Capacity planning views.
- Portfolio resource pressure summary.
- Over-allocation drilldowns.
- Utilization forecasting.

## v2 Scope

- AI-assisted resource summaries and recommendations.
- AI consumes deterministic planning/resource outputs.
- AI does not replace Scheduling Engine authority.

## Release Gates

Each release requires:

- Requirements reviewed.
- Architecture design approved.
- Backend tests and build passing for backend changes.
- Frontend tests and build passing for frontend changes.
- Docker Compose verification.
- Ubuntu deployment compatibility.
- Documentation and ADR updates.
