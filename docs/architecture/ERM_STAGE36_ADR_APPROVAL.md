# ERM Stage 3.6 ADR Approval

## Executive Summary

Stage 3.6 implements the outcome of the Stage 3.5 ADR Review for Epic 1.2 Enterprise Resource Management. The review found that core platform architecture is governed by existing ADRs, while four high-priority ERM decisions required additional governance before Stage 4.

This stage created accepted ADRs for the missing high-priority decisions and updated the existing architecture ADR index. It did not modify backend, frontend, database, Docker, migration, schema, test, configuration, or infrastructure files.

## ADRs Created

| ADR | Status | Purpose |
| --- | --- | --- |
| [ADR-010 ERM Aggregate and Ownership Boundary](adr/ADR-010-erm-aggregate-ownership-boundary.md) | Accepted | Establishes ERM as its own bounded context and Resource as the owner of resource identity, lifecycle, type, profile semantics, and governance metadata. |
| [ADR-011 ERM Assignment Ownership](adr/ADR-011-erm-assignment-ownership.md) | Accepted | Defines ERM as the governance owner of resource assignment concepts while preserving Project, Task, Planning, and Scheduling boundaries. |
| [ADR-012 ERM Permissions and Visibility](adr/ADR-012-erm-permissions-visibility.md) | Accepted | Requires domain-specific permission and visibility governance for resource administration, assignments, capacity, availability, and cost/rates. |
| [ADR-013 ERM Planning Resource Transition](adr/ADR-013-erm-planning-resource-transition.md) | Accepted | Preserves existing Planning resource foundations until an approved ADD defines their relationship to ERM. |

## Existing ADRs Reused

| ADR | Status | Reuse |
| --- | --- | --- |
| [ADR-001 Feature Architecture](adr/ADR-001-feature-architecture.md) | Accepted | Governs feature/module boundaries. |
| [ADR-002 Calendar Architecture](adr/ADR-002-calendar-architecture.md) | Accepted | Preserves Calendar ownership of working hours, holidays, exception days, and calendar definitions. |
| [ADR-003 Scheduling Isolation](adr/ADR-003-scheduling-isolation.md) | Accepted | Preserves Scheduling Engine isolation and prevents ERM from becoming scheduling authority. |
| [ADR-004 API Design](adr/ADR-004-api-design.md) | Accepted | Governs API conventions, DTO boundaries, validation, and compatibility. |
| [ADR-005 Frontend Architecture](adr/ADR-005-frontend-architecture.md) | Accepted | Governs frontend feature structure, shared API client usage, and UI conventions. |
| [ADR-006 Resource Domain](adr/ADR-006-resource-domain.md) | Proposed for Epic 1.2 | Reused as the foundation for Resource/User separation and non-user resource support. |
| [ADR-007 Capacity Model](adr/ADR-007-capacity-model.md) | Proposed for Epic 1.2 | Reused as the capacity and allocation policy foundation. |
| [ADR-008 Calendar Assignment](adr/ADR-008-calendar-assignment.md) | Proposed for Epic 1.2 | Reused as the resource calendar assignment and no-schedule-mutation policy foundation. |
| [ADR-009 Resource Types](adr/ADR-009-resource-types.md) | Proposed for Epic 1.2 | Reused as the explicit resource type policy foundation. |

## Deferred ADRs

The following ADR topics remain intentionally deferred based on Stage 3.5:

| Deferred ADR | Reason |
| --- | --- |
| Resource-Aware SchedulingContext Extension | Scheduling integration is a future roadmap item and must preserve ADR-003. |
| Automatic Resource Leveling | Epic 1.2 excludes automatic leveling and schedule mutation. |
| Portfolio Resource Pressure Read Models | Future reporting integration after ERM foundations. |
| Executive Resource Utilization Widgets | Future dashboard integration after ERM foundations. |
| AI Resource Recommendations | Future AI work; AI must consume deterministic outputs only. |
| Equipment-Specific Metadata | Type-specific behavior can follow generic ERM governance. |
| Facility and Meeting Room Rules | Future type-specific rules. |
| Vehicle Assignment Rules | Future type-specific rules. |
| Vendor and Procurement Model | Procurement is out of scope for Epic 1.2. |
| SaaS Multi-Tenant Resource Isolation | SaaS multi-tenancy is a future roadmap item. |

## Cross References

- ADR-010 extends ADR-006 and ADR-009.
- ADR-011 extends ADR-010 and preserves ADR-003.
- ADR-012 reuses ADR-004, ADR-005, and the Security Architecture.
- ADR-013 extends ADR-010 and ADR-011 while preserving ADR-003 and existing Planning ownership.
- ADR-008 remains the governing resource-calendar assignment policy; no duplicate ADR was created.
- Resource-aware scheduling remains deferred under ADR-003; no scheduling integration ADR was created.

## Governance Validation

Repository facts:

- Existing accepted ADRs govern Scheduling isolation, Calendar ownership, API design, frontend architecture, and feature architecture.
- Stage 3.5 identified four high-priority missing decisions.
- ADR-010 through ADR-013 now cover those high-priority decisions.

Validation:

- No conflicting ADRs were introduced.
- Architectural consistency is maintained with Scheduling isolation, Calendar ownership, Planning ownership, and Resource/User separation.
- ERM governance is complete enough for Stage 4 ADD.
- Existing proposed ADRs ADR-006 through ADR-009 remain related ERM policy references and were not duplicated.
- Deferred topics remain explicitly outside Epic 1.2 governance scope.

## Stage 4 Readiness

Ready for Architecture Design Document (ADD).

Rationale:

- High-priority missing ADRs from Stage 3.5 have been created and accepted.
- Existing ADRs cover reusable platform architecture, Calendar ownership, Scheduling isolation, API design, and frontend conventions.
- Deferred decisions are documented and should not block the Epic 1.2 ADD.
- Stage 4 can now produce an implementation-independent ADD using the approved governance baseline.
