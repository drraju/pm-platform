# ADR-010: ERM Aggregate and Ownership Boundary

## Status

Accepted.

## Date

2026-07-09

## Authors

PM Platform Architecture

## Context

Epic 1.2 requires Enterprise Resource Management to become a governed bounded context. Stage 2 Repository Investigation found that resource-related concepts currently exist only as Planning foundations: project-scoped capacity, allocation, and workload snapshot records. Stage 3 Gap Analysis identified the absence of a standalone Resource aggregate as a primary architectural gap.

Existing architecture already establishes that Users are identity and RBAC actors, while Resources are a separate future domain concept. ADR-006 Resource Domain states that a Resource may optionally reference a User but must also support non-user resources.

## Decision

Enterprise Resource Management is governed as its own bounded context. The Resource aggregate is the architectural owner of resource identity, resource lifecycle, resource type, resource profile semantics, and resource governance metadata.

Users remain identity and authentication actors. A Resource may reference a User where appropriate, but User is not Resource and must not become the Resource aggregate.

Planning remains the owner of planning workspace behavior and existing schedule snapshots. Scheduling remains the owner of scheduling calculations. Calendar remains the owner of calendar definitions, working hours, holidays, and exception days.

## Rationale

This decision preserves bounded context separation and prevents ERM from being modeled as a thin extension of Users or Planning. It supports human and non-human resource management while keeping Auth, Planning, Scheduling, and Calendar responsibilities stable.

This decision also provides the governance baseline needed for Stage 4 ADD decisions about profile, lifecycle, assignment, skills, capacity, availability, and cost boundaries.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Treat User as Resource | Conflates identity with planning capacity and blocks non-user resources such as contractors without login, teams, equipment, facilities, vehicles, and generic resources. |
| Keep resources inside Planning | Keeps resource data project-scoped and prevents enterprise-wide governance, search, lifecycle, skills, and availability views. |
| Let each module define its own resource concept | Creates inconsistent ownership and increases risk of duplicate assignment, capacity, and reporting semantics. |

## Consequences

- ERM receives a clear architectural ownership boundary.
- Existing User and Planning concepts remain valid but are not the Resource aggregate.
- Future ADD work must define how ERM relates to existing Planning resource foundations without breaking backward compatibility.
- Future Resource features must preserve Scheduling and Calendar isolation.

## Future Considerations

- Stage 4 must define the detailed Resource aggregate boundary without introducing scheduling behavior.
- Future epics may extend ERM for deeper type-specific resource behavior.
- SaaS multi-tenancy may require additional organization/tenant ownership decisions later.

## References

- [ADR-006 Resource Domain](ADR-006-resource-domain.md)
- [ADR-009 Resource Types](ADR-009-resource-types.md)
- [ERM Stage 2 Repository Investigation](../ERM_STAGE2_REPOSITORY_INVESTIGATION.md)
- [ERM Stage 3 Architecture Gap Analysis](../ERM_STAGE3_ARCHITECTURE_GAP_ANALYSIS.md)
- [ERM Stage 3.5 ADR Review](../ERM_STAGE35_ADR_REVIEW.md)
