# Feature 1.2.2 Architecture Design Document

## Feature

Feature 1.2.2 - Resource CRUD API

## Status

Approved in Stage 5 architecture review. Persisted to the repository during Stage 5.5 Documentation Alignment.

## 1. Executive Summary

This document is the feature-specific Architecture Design Document for Feature 1.2.2 Resource CRUD API.

It persists the already-approved feature architecture for exposing the Resource aggregate introduced in Feature 1.2.1 through a governed REST API boundary. It does not redesign the ERM bounded context. It does not change the Scheduling Engine, Planning ownership, Calendar ownership, or database schema introduced by Feature 1.2.1.

This ADD is subordinate to and consistent with:

- [ERM Architecture Design Document](ERM_ARCHITECTURE_DESIGN_DOCUMENT.md)
- [Feature Implementation Plan](FEATURE_IMPLEMENTATION_PLAN.md)
- [Epic 1.2 Enterprise Resource Management](../product/epics/EPIC-1.2-Enterprise-Resource-Management.md)
- [ADR-004 API Design](adr/ADR-004-api-design.md)
- [ADR-010 ERM Aggregate and Ownership Boundary](adr/ADR-010-erm-aggregate-ownership-boundary.md)
- [ADR-012 ERM Permissions and Visibility](adr/ADR-012-erm-permissions-visibility.md)
- [ADR-013 ERM Planning Resource Transition](adr/ADR-013-erm-planning-resource-transition.md)

## 2. Scope

### In Scope

- Public REST API exposure for the existing Resource aggregate from Feature 1.2.1.
- Resource CRUD operations for the current Resource domain model.
- Resource list and search behavior aligned with existing platform API conventions.
- Request DTOs, response DTOs, query DTOs, mapping, validation, Swagger documentation, guards, and tests.
- Reuse of the existing `Resource` entity, migration, validation service, and internal resource service patterns.

### Out of Scope

- New Resource domain modeling beyond Feature 1.2.1.
- Skills, competencies, capacity, availability, assignments, cost/rates, and calendar assignment.
- Scheduling integration.
- Planning ownership changes.
- New authentication architecture.
- Frontend implementation.
- Database redesign or replacement of the Feature 1.2.1 migration.

### Future Features

- Feature 1.2.3 Resource Management UI.
- Skills and competencies.
- Calendar assignment.
- Capacity and availability.
- Assignment management.
- Dashboard integration.

## 3. Design Goals

- Expose the Resource aggregate through a stable REST boundary without leaking persistence entities.
- Preserve the ERM bounded context established by Epic 1.2.
- Preserve Scheduling Engine isolation and Planning ownership boundaries.
- Reuse existing NestJS, TypeORM, DTO, Swagger, validation, and authorization patterns already established in the repository.
- Keep database and API evolution additive and backward compatible.

## 4. Architectural Principles

This feature follows the repository architecture and existing ADRs:

- Feature ownership remains under a dedicated backend module surface per [ADR-001 Feature Architecture](adr/ADR-001-feature-architecture.md).
- Public API boundaries use DTOs, thin controllers, guarded endpoints, and service-owned business rules per [ADR-004 API Design](adr/ADR-004-api-design.md).
- Resource remains an ERM-owned aggregate and is not reclassified as User or Planning data per [ADR-010 ERM Aggregate and Ownership Boundary](adr/ADR-010-erm-aggregate-ownership-boundary.md).
- ERM continues to consume existing Auth/RBAC rather than introducing a separate security model per [ADR-012 ERM Permissions and Visibility](adr/ADR-012-erm-permissions-visibility.md).
- Existing Planning resource foundations remain Planning-owned and are not reclassified by this feature per [ADR-013 ERM Planning Resource Transition](adr/ADR-013-erm-planning-resource-transition.md).
- Scheduling remains isolated and untouched per [ADR-003 Scheduling Isolation](adr/ADR-003-scheduling-isolation.md).

## 5. Recommended Feature Architecture

Feature 1.2.2 is an API-boundary feature over the existing 1.2.1 Resource foundation.

The feature uses the following logical structure:

- Controller layer for HTTP routes, guards, parameters, request/response documentation, and delegation.
- Application service layer for orchestration, domain rule enforcement, repository usage, and exception behavior.
- Validation layer split between DTO syntax validation and domain validation.
- Mapper layer for converting `Resource` entities to public response DTOs.
- Existing persistence layer from Feature 1.2.1 reused without redesign.

This feature does not create a new aggregate. It exposes the existing Resource aggregate safely.

## 6. Module Ownership

### Owns

Feature 1.2.2 owns:

- Resource CRUD API controller.
- Resource request/response/query DTO boundaries.
- Resource response mapping.
- Resource API validation flow.
- Resource API tests.

### Reuses

Feature 1.2.2 reuses:

- [resource.entity.ts](../../backend/src/modules/resources/entities/resource.entity.ts)
- [resource.service.ts](../../backend/src/modules/resources/resource.service.ts)
- [resource-validation.service.ts](../../backend/src/modules/resources/resource-validation.service.ts)
- [017_v1_2_1_erm_domain_model.sql](../../backend/src/database/migrations/017_v1_2_1_erm_domain_model.sql)
- shared auth guards and permission decorators under [backend/src/common/authz](../../backend/src/common/authz)

### Does Not Own

- Scheduling behavior.
- Planning allocations or planning resource foundations.
- Calendar definitions or calendar calculation logic.
- User identity or authentication.

## 7. Component Responsibilities

### Controller

The Resource controller is responsible for:

- exposing REST endpoints
- applying authentication and authorization guards
- receiving headers, params, query parameters, and request bodies
- returning response DTOs
- defining Swagger decorators

The controller remains thin and does not contain business logic.

### Service

The Resource API service layer is responsible for:

- orchestrating CRUD behavior
- enforcing domain rules through the existing validation service and service-level checks
- enforcing repository-backed uniqueness and lookup rules
- applying archive semantics instead of destructive deletion where the domain requires retention
- preserving organization and visibility boundaries defined for the feature

### Validation Service

The existing Resource validation service remains the owner of Resource domain validation for current domain fields:

- name
- resource type
- status
- optional user link
- role metadata

DTO validation remains responsible only for request shape and syntax.

### Mapper

The mapper owns conversion between persistence entities and public response DTOs.

Persistence entities must not be returned directly from public endpoints.

### Repository

Feature 1.2.2 reuses TypeORM repository injection over the existing `Resource` entity. It does not introduce a separate persistence pattern.

## 8. API Boundary

The API boundary follows the platform conventions defined by Calendar and other CRUD modules:

- thin guarded controllers
- DTO requests
- DTO responses
- class-validator request validation
- service-owned domain behavior
- Nest exception style for 400, 403, 404, 409, and 422 where applicable
- Swagger documentation on every endpoint

The feature exposes CRUD and list/search behavior for Resource records already modeled in Feature 1.2.1.

This ADD intentionally does not define endpoint-level request or response contracts in detail. That belongs to implementation within the approved architectural boundary.

## 9. DTO Strategy

The DTO strategy is:

- request DTOs for create and update payloads
- response DTOs for all public responses
- query DTOs for list, search, filter, sort, and pagination inputs when exposed

Business rules remain in services. DTOs define request syntax, shape, and allowable primitive values.

## 10. Validation Strategy

Validation is split into two layers:

### DTO Boundary Validation

- request shape
- type coercion through global Nest validation pipeline
- allowed enum values and string/UUID formatting
- query parameter syntax

### Domain Validation

- uniqueness rules
- archive semantics
- resource existence
- rule enforcement around current Resource lifecycle and persisted metadata

This keeps controllers thin and keeps business rules inside the service/domain layer.

## 11. Security and Visibility

Feature 1.2.2 explicitly follows [ADR-012 ERM Permissions and Visibility](adr/ADR-012-erm-permissions-visibility.md).

The approved architectural rules are:

- Resource CRUD uses the existing Auth/RBAC foundation already present in the platform.
- Resource CRUD introduces no new authentication architecture.
- ERM permissions remain governed by ADR-012.
- Permission implementation detail is deferred to implementation.
- Visibility rules remain ERM-governed.
- This feature must consume existing JWT authentication, permission guards, decorators, and authorization policy services.

This ADD does not invent new permission keys. Exact permission-key selection and endpoint-to-permission mapping remain implementation work within the ADR-012 boundary.

## 12. Persistence Strategy

Feature 1.2.2 reuses the persistence model introduced in Feature 1.2.1.

Architectural constraints:

- reuse the existing `enterprise_resources` table
- reuse the existing additive migration baseline
- reuse audit fields and soft-delete conventions
- do not redesign schema ownership
- do not imply migration replacement
- do not take ownership of Planning tables

Search, filtering, and retrieval should align with existing indexed fields and repository conventions already established by Feature 1.2.1.

## 13. Integration Boundaries

### Auth

Feature 1.2.2 consumes existing authentication and authorization infrastructure only.

### Planning

Planning remains unchanged. Existing Planning resource foundations remain Planning-owned.

### Calendar

Calendar remains unchanged. Resource CRUD does not introduce calendar assignment or calendar-aware behavior.

### Scheduling

Scheduling remains untouched. Resource CRUD does not call, mutate, extend, or bypass the Scheduling Engine or `SchedulingContext`.

### Frontend

No frontend work is included in this feature. Future frontend work consumes the Resource CRUD API after this feature is complete.

## 14. Testing Expectations

Implementation should be verifiable through:

- service unit tests
- controller tests
- integration tests for CRUD, validation, and authorization behavior
- regression confirmation that protected modules remain unchanged

The design requires reuse of the repository's existing testing patterns as demonstrated by the Calendar module and Resource foundation tests.

## 15. File-Level Expectations

Expected documentation-consistent implementation surface:

- resource API module files under `backend/src/modules/resources`
- DTO files under a feature-local `dto` directory
- controller, mapper, and API-facing tests

Protected files and modules:

- Scheduling Engine and `SchedulingContext`
- Planning schedule engine services
- Calendar domain ownership modules
- existing Feature 1.2.1 migration and persistence baseline

## 16. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Returning entities directly from the API | Enforce DTO and mapper boundary. |
| Resource CRUD drifting into profile expansion beyond current domain model | Keep the feature bound to the existing 1.2.1 Resource aggregate. |
| Implicit redesign of permissions | Keep permission architecture governed by ADR-012 and defer key selection to implementation. |
| Hidden Planning or Scheduling coupling | Keep Resource CRUD strictly administrative and persistence-backed only. |
| Repository documentation drift | Cross-link this ADD from the architecture index, epic, and feature plan. |

## 17. Acceptance Criteria

The feature design is complete when the repository documentation clearly states that:

- Feature 1.2.2 is named Resource CRUD API.
- The existing Resource aggregate from Feature 1.2.1 is the domain foundation for the feature.
- Public APIs use DTOs rather than entities.
- Auth/RBAC reuse and ADR-012 governance are explicit.
- Planning, Calendar, and Scheduling boundaries are preserved.
- No schema redesign is implied.

## 18. Definition of Done for Architecture

Architecture is complete for Feature 1.2.2 when:

- this ADD exists in the repository
- the architecture index links to it
- the feature tracker reflects Stage 5 completion
- Epic and implementation plan documents consistently describe Feature 1.2.2 as Resource CRUD API
- technical design review can use repository documentation as the authoritative baseline

## 19. Traceability

- Epic baseline: [Epic 1.2 Enterprise Resource Management](../product/epics/EPIC-1.2-Enterprise-Resource-Management.md)
- Epic architecture baseline: [ERM Architecture Design Document](ERM_ARCHITECTURE_DESIGN_DOCUMENT.md)
- Feature planning: [Feature Implementation Plan](FEATURE_IMPLEMENTATION_PLAN.md)
- Feature progress: [Feature Progress](../FEATURE_PROGRESS.md)
