# ADR-003: Scheduling Authority

## Status

Accepted

## Context

Scheduling data appears in Planning, Tasks, Overview, Reports, Portfolio, Baselines, and future AI features. If each module calculates dates, progress, and schedule semantics independently, data will drift and enterprise trust will erode.

## Decision

The Planning Engine is the scheduling authority. Other modules may display, filter, export, or summarize planning data, but they must consume scheduling facts from the Planning Engine or documented planning-derived models.

## Consequences

- Summary dates, duration, progress, and status are calculated once.
- Milestone normalization is enforced centrally.
- Reports and portfolio views depend on planning outputs.
- Backend validation remains mandatory even when UI prevents invalid inputs.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| UI-driven scheduling | Not auditable and inconsistent across clients |
| Report-driven recalculation | Produces conflicting schedule facts |
| Direct task table as sole authority | Insufficient for snapshots, baselines, critical path, and dependencies |

## Future Impact

This decision prepares the platform for critical path, baselines, calendars, resource allocation, portfolio scheduling, and AI schedule risk analysis.

## Related Documents

- [Planning Engine v2](../architecture/planning-engine-v2.md)
- [Reporting Engine](../architecture/reporting-engine.md)
