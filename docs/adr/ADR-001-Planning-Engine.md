# ADR-001: Planning Engine

## Status

Accepted

## Context

The platform requires enterprise scheduling capabilities including WBS hierarchy, milestones, dependencies, rollups, baselines, critical path, calendars, and future resource planning. Earlier implementations spread planning behavior across tasks, planning rows, UI components, and reports.

## Decision

The Planning Engine is the canonical owner of scheduling rules and calculated planning data. It will model primary task types as Task, Summary, and Milestone, with categories for phase/workstream/release/drop semantics.

## Consequences

- Planning rules are centralized.
- Summary rollups must be engine-owned.
- UI modules consume calculated fields.
- Reports and portfolio views must not implement independent schedule logic.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Keep ad hoc taskKind behavior | Causes inconsistent UI, reports, and validation |
| Make Phase and Drop separate primary types | Creates unnecessary scheduling complexity |
| Let UI calculate scheduling | Violates backend authority and auditability |

## Future Impact

This decision enables critical path, baselines, calendars, portfolio Gantt, resource planning, and AI schedule analysis.

## Related Documents

- [Planning Engine v2](../architecture/planning-engine-v2.md)
- [ADR-003 Scheduling Authority](./ADR-003-Scheduling-Authority.md)
