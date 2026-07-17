# REST API Design Standard

Status: Canonical

This document defines the public REST API conventions for PM Platform. It complements [ADR-004 API Design](adr/ADR-004-api-design.md) and is the implementation standard for new and changed endpoints.

## Resource Naming

Routes use lowercase plural nouns. Approved top-level resource names are:

- `projects`
- `tasks`
- `milestones`
- `portfolio`
- `customers`
- `resources`
- `documents`
- `risks`
- `issues`
- `decisions`

Nested routes express ownership or query scope, for example `GET /projects/{projectId}/milestones`. Route and JSON field names remain stable once published; JSON fields use camelCase.

## HTTP Conventions

| Method | Purpose | Typical success response |
| --- | --- | --- |
| `GET` | Read a resource or collection without mutation. | `200 OK` |
| `POST` | Create a resource or invoke an explicitly modelled command. | `201 Created` |
| `PATCH` | Partially update an existing resource. | `200 OK` |
| `DELETE` | Delete, archive, or soft-delete according to domain policy. | `204 No Content` |

HTTP methods must be idempotent where the protocol requires it. Controllers must not reinterpret domain behavior based on the HTTP method.

## Pagination

Collection endpoints use:

- `page`: one-based page number; default `1`.
- `pageSize`: requested page size with a documented default and enforced maximum.
- `total`: total matching records before pagination.
- `totalPages`: `ceil(total / pageSize)`.

The response contains `items`, `page`, `pageSize`, `total`, and `totalPages`. Ordering must be deterministic so records do not move unpredictably between pages.

## Sorting

- `sort` selects one field from an endpoint-specific allowlist.
- `order` is `asc` or `desc`.
- Unsupported fields and directions return `400 Bad Request`.
- Every collection defines a stable fallback order for ties.

## Filtering

Common query names are:

- `search`
- `ownerId` for identifier-based owner filtering; public documentation may describe this as owner filtering
- `state`
- `category`
- `dateFrom`
- `dateTo`
- `critical`
- `overdue`

Feature-specific filters may be added when documented. Filtering belongs in the query/application service, not the controller. Date ranges are inclusive unless the endpoint explicitly states otherwise.

## Response Contracts

Public APIs return response DTOs. Persistence entities and internal application projections are not public contracts.

The required flow is:

```text
Domain and persistence data
  -> internal application projection
  -> transport mapper
  -> public response DTO
```

- Public DTOs define documented API fields and nullability.
- Internal projections compose derived read-model values.
- Mapper classes perform field conversion, enum conversion, null handling, and date formatting only.
- Entities, repositories, planning snapshots, and internal scheduling types must not be exposed.

## Validation

Transport DTOs and the global validation pipeline enforce:

- UUID format for identifiers.
- Enum allowlists.
- Integer pagination bounds.
- Sorting allowlists and direction.
- ISO date formats and valid date ranges (`dateTo` must not precede `dateFrom`).
- Boolean query values.
- Documented string length limits.
- Rejection of unexpected properties where the platform validation pipeline applies.

Business invariants remain in the domain or application layer.

## Error Contracts

Use the existing NestJS platform error contract and exception handling. Do not introduce feature-specific envelopes.

| Status | Meaning |
| --- | --- |
| `400` | Malformed or invalid request. |
| `401` | Authentication is missing or invalid. |
| `403` | The authenticated actor lacks permission or visibility. |
| `404` | The visible resource does not exist. |
| `409` | The request conflicts with current resource state. |
| `422` | The request is syntactically valid but cannot be processed under the applicable contract. |
| `500` | Unexpected server failure; internal details are not exposed. |

Error messages should be actionable without revealing hidden resources or sensitive implementation details.

## Swagger Standards

- Tags use stable lowercase resource names.
- Every operation has a concise verb-led summary.
- Path identifiers declare UUID format where applicable.
- Query filters, enums, defaults, bounds, and nullability are represented accurately.
- Success responses reference public response DTOs.
- Expected validation, authentication, authorization, not-found, and conflict responses are documented.
- Protected controllers declare bearer authentication.
- Examples illustrate the public contract and must not contain entity-only fields.

OpenAPI regression tests should verify important paths and response schemas.

## Versioning Strategy

The current API is unversioned. Backward compatibility is the default:

- Prefer additive optional fields and endpoints.
- Do not silently change field meaning, nullability, enum values, or status codes.
- Deprecations must be documented before removal and retain a practical migration period.
- Breaking changes require architecture approval and an explicit versioning plan.
- Compatibility aliases are temporary and must identify their replacement and removal criteria.

## Architecture Rules

- Controllers are thin transport adapters.
- Controllers do not access repositories.
- Controllers do not implement business rules or derived-state calculations.
- Application services own orchestration.
- Projection composers own internal read-model derivation.
- Domain services own business invariants and normalization.
- Repositories own persistence access only.
- Authorization reuses platform permissions and visibility services.
- Public DTOs remain separate from entities and internal projections.

