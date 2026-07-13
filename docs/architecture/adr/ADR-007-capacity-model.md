# ADR-007: Capacity Model

## Status

Accepted.

## Date

2026-07-13

## Authors

PM Platform Architecture

## Context

Existing Planning foundations include project-scoped resource capacity and allocation records. Epic 1.2 requires Enterprise Resource Management to govern enterprise resource supply, availability, utilization, and remaining capacity without destabilizing Planning, Calendar, or Scheduling ownership boundaries.

The ERM Architecture Design Document states that:

- ERM owns capacity governance.
- ERM owns availability governance.
- Calendar remains the owner of working-day semantics, working hours, holidays, and exception days.
- Scheduling remains the owner of scheduling calculations.
- Planning remains the owner of existing planning workspace resource foundations until an approved transition changes that boundary.

Stage 3.5 Architecture Review for Feature 1.2.5 concluded that the architecture is sound in principle, but implementation must not begin until the capacity model is fully governed. The previous version of this ADR was too broad to govern persistence, calculation, and explainability decisions safely.

## Decision

### 1. Capacity Policy

Capacity is governed as persisted ERM-owned supply policy. The persisted source of normal resource supply is the Capacity Policy.

Capacity Policy defines the normal available supply for a Resource over an effective period. It is an ERM-owned concept under the Resource aggregate and is not a Planning, Calendar, or Scheduling concept.

### 2. Availability Projection

Availability is always a derived projection. It is not a primary persisted source-of-truth entity in Feature 1.2.5.

Availability Projection is calculated from:

- Capacity Policy
- Resource lifecycle/status
- Calendar context
- Availability Overrides
- Assignment demand

Availability must remain explainable and reconstructable from governed source-of-truth inputs.

### 3. Utilization

Utilization is always calculated and never persisted as a governing source-of-truth value in Feature 1.2.5.

Utilization is derived from governed supply and demand inputs and exists as a read model, response field, or future reporting projection.

### 4. Remaining Capacity

Remaining Capacity is always calculated and never persisted as a governing source-of-truth value in Feature 1.2.5.

Remaining Capacity is derived from available capacity minus committed or governing demand inputs.

### 5. Canonical Persistence and Calculation Unit

The canonical persistence and calculation unit for Feature 1.2.5 is:

`capacity_minutes_per_working_day`

Daily minutes are the authoritative ERM unit for persisted supply and deterministic calculation.

Weekly, monthly, hourly, percentage, utilization, and remaining-capacity values are derived views and must not replace the canonical daily-minute unit as the governing source.

### 6. Source-of-Truth Entities

Feature 1.2.5 may persist:

- Resource
- Capacity Policy
- Availability Override
- Resource Assignment (existing ERM demand input)
- Calendar reference identifiers where approved by ERM and Calendar architecture

Feature 1.2.5 must not persist as source-of-truth entities:

- Availability Projection
- Utilization
- Remaining Capacity
- Persisted availability snapshots
- Scheduling outputs

### 7. Calculation Principles

Capacity and availability calculations in ERM must be:

- deterministic
- explainable
- reproducible
- idempotent

Deterministic means the same governed inputs produce the same result.

Explainable means responses can describe how the result was derived from governed inputs.

Reproducible means the result can be recalculated later from the same persisted source-of-truth inputs.

Idempotent means read-side calculations do not mutate source state and repeated calculation does not change persisted data.

### 8. Persistence Rules

For Feature 1.2.5:

- Persist Capacity Policies.
- Persist Availability Overrides.
- Do not persist Availability Projections.
- Do not persist Utilization.
- Do not persist Remaining Capacity.
- Do not introduce persisted snapshots in Feature 1.2.5.

If a future feature requires caching, snapshotting, or materialized projections for performance, that work must be governed by a future approved architecture decision or ADD and must preserve explainability.

### 9. Database Invariants

The capacity model must enforce the following invariants:

- Capacity Policies must not have invalid effective date ranges.
- Capacity Policies must not have overlapping effective periods within the same governed scope.
- Availability Overrides must not have invalid date ranges.
- Capacity values must not be negative.
- Override values must not be negative where a quantitative override is allowed.
- Referential integrity must be preserved for Resource and approved reference relationships.
- Persistence constraints must preserve consistency even if application validation is bypassed.

### 10. Ownership Boundaries

ERM owns:

- Capacity Policy governance
- Availability Override governance
- Availability Projection rules
- Utilization and remaining-capacity calculation rules

Calendar owns:

- working-day semantics
- working hours
- holidays
- exception days
- timezone-aware calendar definition behavior

Planning owns:

- existing Planning resource capacity/allocation/workload foundations
- planning workspace behavior
- planning read models and snapshots

Scheduling owns:

- scheduling calculations
- scheduling context
- critical path, float, and date calculation behavior

Feature 1.2.5 must not:

- duplicate Calendar logic inside ERM
- reclassify existing Planning persistence as ERM-owned
- persist SchedulingContext
- mutate schedules as part of capacity or availability calculation

## Rationale

This decision keeps enterprise resource supply governance inside ERM while preserving the architecture already established by ADR-010, ADR-011, ADR-012, and ADR-013.

Using a single canonical daily-minute unit keeps the model precise enough for working-day calculations, calendar-aware variation, utilization explanation, and future AI consumption. Treating availability, utilization, and remaining capacity as derived views preserves explainability and avoids stale persisted state during the first capacity feature.

This decision also prevents Feature 1.2.5 from overreaching into Planning or Scheduling before a future approved transition or integration design.

## Alternatives Considered

| Alternative | Rejected Because |
| --- | --- |
| Persist availability as the source of truth | Availability depends on other governed inputs and would become stale or opaque if stored as primary truth. |
| Persist utilization and remaining capacity | These are derived outputs, not governing inputs; persistence would increase inconsistency risk. |
| Use weekly capacity as the canonical unit | Poor fit for holidays, partial-week exceptions, and explainable daily calculations. |
| Use percentage only as the canonical unit | Cannot express deterministic available minutes or support clear remaining-capacity calculation. |
| Let Planning remain the owner of enterprise capacity | Prevents ERM from becoming the governed enterprise resource context. |
| Duplicate calendar semantics inside ERM | Violates Calendar ownership and creates inconsistent working-day rules. |
| Persist snapshots in Feature 1.2.5 | Premature optimization and unnecessary complexity before the model is proven. |
| Mutate schedules during capacity calculation | Violates Scheduling isolation. |

## Consequences

- Stage 4.1 may persist Capacity Policies and Availability Overrides only.
- Stage 4.1 must use `capacity_minutes_per_working_day` as the canonical persisted supply unit.
- Availability, utilization, and remaining capacity remain derived in Feature 1.2.5.
- Calendar integration must occur through approved service or boundary abstractions rather than copied logic.
- Existing Planning resource persistence remains Planning-owned until a future approved transition changes that boundary.
- Portfolio, Dashboard, and AI consumers can rely on deterministic and explainable ERM-derived outputs.

## Future Considerations

- Future features may add caching, materialized read models, or snapshots only through approved architecture review when justified by performance needs.
- Future capacity planning features may derive weekly, monthly, and forecast views from the canonical daily-minute unit.
- Future Scheduling integration may consume governed ERM availability context only through approved interfaces that preserve Scheduling isolation.
- Future Portfolio, Dashboard, and AI features may consume availability, utilization, and pressure summaries as deterministic derived outputs.

## References

- [ERM Architecture Design Document](../ERM_ARCHITECTURE_DESIGN_DOCUMENT.md)
- [ADR-010 ERM Aggregate and Ownership Boundary](ADR-010-erm-aggregate-ownership-boundary.md)
- [ADR-011 ERM Assignment Ownership](ADR-011-erm-assignment-ownership.md)
- [ADR-012 ERM Permissions and Visibility](ADR-012-erm-permissions-visibility.md)
- [ADR-013 ERM Planning Resource Transition](ADR-013-erm-planning-resource-transition.md)
- [Epic 1.2 Enterprise Resource Management](../../product/epics/EPIC-1.2-Enterprise-Resource-Management.md)
- [Resource Capacity Planning](../../product/resource-capacity-planning.md)
