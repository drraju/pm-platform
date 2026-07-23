# ADR-013: ERM Planning Resource Transition

## Status

Accepted.

## Date

2026-07-09

## Authors

PM Platform Architecture

## Context

The current Planning module contains resource-related foundations: resource capacities, resource allocations, and resource workload snapshots. These are project-scoped planning concepts and currently support user and team resource units.

Epic 1.2 requires ERM to become an independent bounded context for enterprise resource governance. Stage 3 Gap Analysis identified a transition risk because existing Planning tables and APIs already use `resource_*` naming and own allocation/capacity behavior.

## Decision

Existing Planning resource foundations remain Planning-owned until an approved ADD defines the transition boundary. ERM must not directly take ownership of existing Planning behavior by assumption.

ERM is the future owner of enterprise resource governance. Planning remains the owner of planning workspace behavior, existing planning allocations, scheduling snapshots, and schedule analysis outputs.

Any future relationship between ERM and existing Planning resource foundations must preserve backward compatibility and Scheduling isolation.

## Rationale

Planning resource data already exists and is part of the current planning workspace architecture. Treating it as automatically migrated into ERM would risk breaking existing Planning behavior and blur ownership before the ADD is complete.

This decision establishes governance for a controlled transition: ERM may become the source of enterprise resource governance, but existing Planning foundations cannot be reclassified without explicit architecture design.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Immediately redefine Planning resource tables as ERM-owned | Changes ownership without design and risks existing Planning behavior. |
| Ignore existing Planning resource foundations | Creates duplicate concepts and increases confusion around capacity/allocation ownership. |
| Let Planning remain the permanent enterprise resource owner | Prevents a standalone ERM bounded context and enterprise-wide resource governance. |
| Couple ERM directly to Scheduling Engine during transition | Violates Scheduling isolation and bypasses Planning boundaries. |

## Consequences

- Stage 4 must explicitly address the relationship between ERM and existing Planning resource concepts.
- Existing Planning APIs and behavior remain backward-compatible until an approved design changes the boundary.
- ERM governance can proceed without destabilizing Scheduling Engine or Planning snapshots.
- Reporting contexts must not infer ownership from table names alone.

## Future Considerations

- Future epics may define read models or integration adapters between ERM and Planning.
- Portfolio and Dashboard may eventually consume ERM-derived resource pressure signals.
- Any SchedulingContext extension remains deferred to a future approved scheduling integration effort.

## References

- [ADR-003 Scheduling Isolation](ADR-003-scheduling-isolation.md)
- [ADR-007 Capacity Model](ADR-007-capacity-model.md)
- [ADR-010 ERM Aggregate and Ownership Boundary](ADR-010-erm-aggregate-ownership-boundary.md)
- [ADR-011 ERM Assignment Ownership](ADR-011-erm-assignment-ownership.md)
- [ERM Stage 2 Repository Investigation](../ERM_STAGE2_REPOSITORY_INVESTIGATION.md)
- [ERM Stage 3 Architecture Gap Analysis](../ERM_STAGE3_ARCHITECTURE_GAP_ANALYSIS.md)
- [ERM Stage 3.5 ADR Review](../ERM_STAGE35_ADR_REVIEW.md)
