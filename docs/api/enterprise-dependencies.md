# Enterprise Dependency API

## Status

Feature 1.3.2 is complete and approved for Release 1.0. These APIs are additive, read-only contracts. Existing task-dependency mutation routes remain available for backward compatibility.

## Security

Both routes require:

- JWT authentication.
- `project.read` permission.
- Existing project visibility.

A dependency outside the caller's visible projects is treated as not found. Responses never expose hidden dependency counts, endpoint details, blocked reasons, or impact paths.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/dependencies/{dependencyId}` | Return one visible enterprise dependency projection. |
| `GET` | `/projects/{projectId}/dependencies` | Return a filtered and paginated dependency collection for one visible project. |

Path identifiers must be UUIDs. Invalid identifiers return `400`; absent or hidden dependencies return `404`.

## Collection Parameters

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `dependencyType` | comma-separated `FS`, `SS`, `FF`, `SF` | all | Filter by dependency type. |
| `health` | comma-separated health values | all | Filter by `satisfied`, `blocking`, `at_risk`, `invalid`, or `unknown`. |
| `blocked` | boolean | unset | `true` selects blocked successors; `false` selects definitively not-blocked successors and excludes unknown state. |
| `taskId` | UUID or comma-separated UUIDs | all | Match either endpoint. |
| `search` | string, maximum 200 characters | unset | Case-insensitive predecessor or successor title search. |
| `page` | integer, minimum 1 | `1` | One-based page number. |
| `pageSize` | integer, 1–100 | `25` | Page size. |
| `sort` | enum | `predecessor` | `predecessor`, `successor`, `health`, `impact`, or `dependencyType`. |
| `order` | enum | `asc` | `asc` or `desc`. |
| `impactDepth` | integer, 1–100 | `25` | Maximum downstream traversal depth. |
| `impactTaskLimit` | integer, 1–1000 | `500` | Maximum impacted tasks returned per traversal. |

Unsupported values and out-of-range parameters return `400` through the platform validation contract.

## Response Contract

Each dependency response contains:

- `id`, `dependencyType`, and `lagDays`.
- Public predecessor and successor task summaries.
- Derived `health` and `healthReason`.
- Derived `blockedState`.
- Derived impact counts, impact level, maximum depth, traversal nodes, traversed dependency IDs, and truncation indicator.

Collection responses contain `items`, `page`, `pageSize`, `total`, and `totalPages`.

Persistence entities, audit fields, soft-delete fields, repositories, and internal projections are not public API contracts.

## Health Semantics

Health precedence protects invalid or unsupported data from appearing healthy:

1. Missing, self-referencing, deleted, or summary endpoints are `invalid`.
2. Legacy Start-to-Finish dependencies are `unknown` because ADR-009 excludes them from new scheduling graphs.
3. Dependencies with nonzero lag or lead are `unknown` because offset mathematics belongs to Feature 1.3.3.
4. A completed successor or satisfied supported constraint is `satisfied`.
5. A missed planned constraint is `at_risk`.
6. Other unmet supported constraints are `blocking`.

Blocked state is derived from all visible incoming dependencies and never changes the persisted Task workflow status.

## Backward Compatibility

Existing `/projects/{projectId}/task-dependencies` mutation and legacy read routes are unchanged. They retain their established entity-shaped contracts. New consumers should use the enterprise read routes documented here.

There are no breaking changes and no database migration for Feature 1.3.2.

## Deferred Work

- Lead/lag scheduling mathematics.
- Working-day and calendar-aware offsets.
- Start-to-Finish scheduling participation.
- Cross-project scheduling propagation.
- Dependency comments and dedicated history timelines.
- Frontend dependency-management surfaces.
