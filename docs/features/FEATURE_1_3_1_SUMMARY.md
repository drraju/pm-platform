# Feature 1.3.1 — Enterprise Milestone Management

## Status

Backend implementation is complete through Stage 6. Frontend delivery, final integration/release verification, and any subsequent lifecycle stages remain pending.

## Purpose

Enterprise Milestone Management provides consistent milestone lifecycle, scheduling, baseline, projection, query, portfolio, and REST behavior without introducing a second aggregate beside Task.

## Architecture

- `Task` is the canonical aggregate and `taskKind = milestone` is the canonical discriminator.
- `SchedulingFoundationService` owns milestone normalization and invariant enforcement.
- `TasksService` owns milestone lifecycle mutations and persistence orchestration.
- Planning remains scheduling authority and owns schedule changes and snapshot rebuilds.
- `MilestoneQueryService` performs read-only, visibility-aware milestone queries.
- `MilestoneProjectionComposer` combines Task, owner, current baseline, Planning snapshot, and schedule-analysis outputs.
- Transport mappers convert internal projections into public response DTOs.

There is no Milestone entity, repository, module, aggregate, or table.

## Implemented Components

- Milestone lifecycle completion, reopening, and cancellation normalization.
- Category, duration, progress, planned-date, and actual-date validation.
- Audit attribution for milestone mutations.
- Additive PostgreSQL migration, constraints, indexes, and upgrade normalization.
- Baseline milestone-category capture.
- Canonical Tasks application-service mutation path with Projects and Planning delegation.
- Batched project and portfolio milestone queries without per-milestone repository reads.
- Internal milestone projection and public transport mapping.
- Portfolio regression correction so future standard Tasks are not reported as milestones.

## REST APIs

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/projects/{projectId}/milestones` | List visible project milestones with filtering, sorting, and pagination. |
| `GET` | `/projects/{projectId}/milestones/{taskId}` | Read one visible project milestone. |
| `GET` | `/portfolio/milestones` | List milestones across visible portfolio projects. |

The collection contract supports state, category, owner, project, date range, critical, overdue, cancelled, search, pagination, and sorting filters. APIs reuse `project.read`, `portfolio.view`, existing Task permissions, project visibility, and Planning permissions; no milestone-specific permissions were created.

## Application Services and Read Models

`MilestoneQueryService` is read-only. It loads milestone Tasks, latest Planning snapshots with schedules, and current baselines in a constant number of repository operations. It never saves a Task.

`MilestoneProjection` provides planned, forecast, actual, and baseline dates; variance; owner; criticality; state; overdue status; days remaining; and calculation metadata. These are derived application values, not database columns.

## Database

Migration `026_enterprise_milestone_domain.sql` adds milestone duration and actual-date constraints, lifecycle progress consistency, baseline category support, filtered indexes, and backward-compatible data normalization. Milestones continue to persist only in `tasks`.

## Tests

Coverage includes domain normalization, lifecycle transitions, validation, application services, projection state and variance, baseline and forecast composition, query filters, sorting, pagination, constant query counts, Portfolio regression, RBAC metadata, REST validation, error contracts, Swagger/OpenAPI contracts, backward compatibility, and architecture protection.

At Stage 6 completion, the backend build passed and the full suite reported 95 passing suites and 565 passing tests, with 6 existing todos.

## ADR Compliance

- Scheduling isolation and scheduling authority remain unchanged.
- Existing Task/WBS and baseline architecture remain intact.
- REST behavior follows [ADR-004 API Design](../architecture/adr/ADR-004-api-design.md) and the [REST API Design Standard](../architecture/API_DESIGN_STANDARD.md).
- No duplicate milestone aggregate or persistence model was introduced.

## Lessons Learned

- A discriminator-backed capability can remain coherent when lifecycle rules have one owner.
- Derived delivery state belongs in a projection, not in controllers or frontend calculations.
- Scheduling outputs can be consumed without changing scheduling algorithms.
- Architecture regression tests are valuable protection against accidental duplicate aggregates.

## Future Enhancements

- Frontend milestone list, detail, filters, and portfolio presentation.
- Final end-to-end and release-environment verification.
- Observability and performance validation against production-scale portfolios.
- Any Feature 1.3.2 enhancements approved through their own architecture lifecycle.

