# ADR-011: ERM Assignment Ownership

## Status

Accepted.

## Date

2026-07-09

## Authors

PM Platform Architecture

## Context

The current repository has several assignment-related concepts. Projects own project membership. Tasks own task assignees. Planning owns project-scoped resource allocations. Stage 3 Gap Analysis identified assignment ownership as a high-priority unresolved ERM decision because current assignment semantics are spread across Projects, Tasks, and Planning.

Epic 1.2 requires Enterprise Resource Management to represent resource assignments while preserving Planning and Scheduling boundaries.

## Decision

ERM owns resource assignment governance. Resource assignment is an ERM domain concept describing resource commitment or demand against projects and, where appropriate, planning work.

Projects continue to own project governance and membership. Tasks continue to own task work items and current assignee semantics. Planning continues to own planning workspace behavior, scheduling snapshots, and schedule analysis outputs. Scheduling remains the owner of scheduling calculations and must not be mutated by resource assignment administration.

Resource assignment governance must not make ERM the scheduling authority.

## Rationale

ERM needs a coherent assignment ownership boundary to support enterprise resource visibility, capacity analysis, and future portfolio pressure reporting. Keeping assignment governance in ERM avoids scattering future assignment semantics across Projects, Tasks, and Planning while preserving existing module responsibilities.

This decision is architectural only. The ADD must determine the precise relationship between ERM assignments and existing Planning resource allocations.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Planning owns all resource assignments | Keeps assignments project/planning-scoped and prevents enterprise resource governance. |
| Tasks own all resource assignments | Couples resource management to work-item assignment and does not cover project-level or non-task commitments. |
| Projects own all resource assignments | Conflates project membership/governance with capacity demand and allocation. |
| Scheduling owns assignments | Violates Scheduling isolation and risks schedule mutation from administrative workflows. |

## Consequences

- ERM becomes the governance owner for resource assignment concepts.
- Existing Project, Task, and Planning assignment-related behavior must remain backward compatible.
- Stage 4 must define boundaries between ERM assignment governance and existing Planning resource allocation foundations.
- Resource assignment must not directly change schedule dates, float, or critical path.

## Future Considerations

- Future Planning integration may consume ERM assignment context through an approved boundary.
- Portfolio and Dashboard may later consume ERM assignment summaries for reporting.
- Automatic resource leveling remains outside this decision.

## References

- [ADR-003 Scheduling Isolation](ADR-003-scheduling-isolation.md)
- [ADR-010 ERM Aggregate and Ownership Boundary](ADR-010-erm-aggregate-ownership-boundary.md)
- [ERM Stage 2 Repository Investigation](../ERM_STAGE2_REPOSITORY_INVESTIGATION.md)
- [ERM Stage 3 Architecture Gap Analysis](../ERM_STAGE3_ARCHITECTURE_GAP_ANALYSIS.md)
- [ERM Stage 3.5 ADR Review](../ERM_STAGE35_ADR_REVIEW.md)
