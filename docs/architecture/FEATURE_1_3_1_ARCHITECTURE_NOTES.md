# Feature 1.3.1 Architecture Notes

## Why Milestones Remain Tasks

A milestone participates in the same project hierarchy, dependencies, ownership, permissions, audit history, baseline capture, and Planning schedule as other Tasks. Creating a Milestone aggregate or table would duplicate identity, persistence, authorization, and dependency behavior. The existing `taskKind = milestone` discriminator therefore remains canonical.

## Why the Scheduling Engine Was Untouched

The Scheduling Engine already treats milestone nodes as zero-duration schedule endpoints and calculates critical path and float deterministically. Enterprise milestone work adds lifecycle, persistence constraints, projections, and APIs around those outputs; it does not require a different forward pass, backward pass, float calculation, critical-path algorithm, or `SchedulingContext`.

Keeping the engine unchanged preserves deterministic scheduling behavior and protects existing Planning compatibility.

## Why a Projection Layer Exists

The public milestone view combines data owned by different contexts:

- Task identity, lifecycle, category, owner, and actual dates.
- Planning forecast and calculation metadata.
- Current baseline date.
- Schedule-analysis criticality.

Persisting that combined shape would introduce synchronization and stale-data risks. `MilestoneProjectionComposer` derives it without writes, and a transport mapper converts it to a stable public DTO. This gives every consumer one calculation while keeping internal entities private.

## Why TasksService Owns Mutations

Task is the aggregate being mutated. `TasksService` is therefore the canonical application service for milestone completion, reopening, cancellation, audit attribution, and persistence. Projects and Planning may orchestrate project or schedule concerns, but delegate Task mutation rather than implementing parallel milestone lifecycle behavior.

## Why Planning Owns Schedules

Planning owns schedule changes, snapshot rebuilds, forecast refresh, and calls into the Scheduling Engine. TasksService must not become a second scheduling authority. This separation allows lifecycle and schedule orchestration to cooperate without moving CPM rules into the Task domain.

## Lessons for Future Features

- Extend an existing aggregate when identity and lifecycle ownership already fit.
- Centralize normalization before adding more mutation entry points.
- Use projections for cross-context read models instead of persistence duplication.
- Keep controllers limited to validation, delegation, and mapping.
- Batch related reads and add regression tests that prevent N+1 behavior.
- Protect frozen architecture with tests that reject duplicate entities, repositories, modules, and tables.
- Do not change deterministic engines merely to expose richer application views.

## Related Documents

- [Feature 1.3.1 Summary](../features/FEATURE_1_3_1_SUMMARY.md)
- [REST API Design Standard](API_DESIGN_STANDARD.md)
- [Scheduling Architecture](05-SCHEDULING-ARCHITECTURE.md)
- [Domain Model](02-DOMAIN-MODEL.md)
- [ADR-003 Scheduling Isolation](adr/ADR-003-scheduling-isolation.md)
- [ADR-004 API Design](adr/ADR-004-api-design.md)

