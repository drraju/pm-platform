# ADR-012: ERM Permissions and Visibility

## Status

Accepted.

## Date

2026-07-09

## Authors

PM Platform Architecture

## Context

The platform already has authentication, RBAC, permission guards, and frontend permission-aware navigation. Stage 3 Gap Analysis found that ERM-specific permissions do not exist. Epic 1.2 introduces resource profile, capacity, availability, assignment, and cost/rate concepts that may expose sensitive operational or financial information.

Stage 3.5 identified ERM permissions and visibility as a high-priority missing ADR.

## Decision

ERM requires domain-specific permission and visibility governance. Resource data access must be governed independently from general project, task, user, dashboard, and portfolio permissions.

ERM visibility policy must distinguish between administrative resource management, resource viewing, assignment management, capacity/availability visibility, and sensitive cost/rate visibility.

Existing Auth and RBAC remain the platform security foundation. ERM must consume the existing authorization architecture rather than creating a separate authentication or authorization framework.

## Rationale

Resource data can reveal sensitive capacity, availability, assignment, contractor, and cost information. Reusing broad project or user permissions for all ERM behavior would make access control too coarse and could expose information to roles that should not see it.

Domain-specific governance also allows ERM to evolve without changing the core Auth identity model.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Reuse only project permissions | Project permissions do not express resource-wide administration, cost visibility, or cross-project resource governance. |
| Reuse only user management permissions | User management is identity administration and does not cover non-user resources. |
| Make all resource data globally visible | Exposes sensitive capacity, availability, assignment, and cost information. |
| Create separate ERM authentication | Duplicates platform security and conflicts with existing Auth/RBAC architecture. |

## Consequences

- Stage 4 must account for ERM-specific authorization boundaries.
- ERM must preserve existing JWT and RBAC infrastructure.
- Cost/rate visibility requires explicit governance and must not be treated as ordinary resource metadata.
- Frontend navigation and ERM UI access must align with backend permission policy.

## Future Considerations

- SaaS multi-tenancy may introduce additional organization or tenant visibility rules.
- Future Portfolio, Dashboard, and AI integrations must respect ERM visibility boundaries.
- Resource self-service scenarios may require additional permission distinctions later.

## References

- [ADR-004 API Design](ADR-004-api-design.md)
- [ADR-005 Frontend Architecture](ADR-005-frontend-architecture.md)
- [Security Architecture](../07-SECURITY-ARCHITECTURE.md)
- [ERM Stage 3 Architecture Gap Analysis](../ERM_STAGE3_ARCHITECTURE_GAP_ANALYSIS.md)
- [ERM Stage 3.5 ADR Review](../ERM_STAGE35_ADR_REVIEW.md)
