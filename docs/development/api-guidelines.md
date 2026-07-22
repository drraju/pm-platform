# API Guidelines

The canonical, detailed REST contract is [REST API Design Standard](../architecture/API_DESIGN_STANDARD.md). This document remains a concise contributor checklist.

## REST Principles

APIs should model domain resources with predictable nouns, HTTP methods, and status codes.

| Method | Use |
| --- | --- |
| GET | Read resources |
| POST | Create resources or command-style operations |
| PATCH | Partial updates |
| DELETE | Remove or soft-delete resources |

## Naming

- Use plural resource names.
- Use camelCase fields.
- Keep route names stable.
- Prefer domain terms documented in architecture docs.

## Versioning

Current APIs are unversioned. Breaking changes should be staged through compatibility fields or future versioned routes.

## DTO Design

- Request DTOs validate input.
- Response DTOs define public shape.
- Avoid leaking persistence-only fields unless needed.
- Map internal projections to public response DTOs through a transport mapper.
- Use explicit nullable values for clearable fields.

## Validation

Backend validation is mandatory. Frontend validation improves experience but is not authoritative.

## Error Handling

Errors should include clear messages suitable for user-facing display where possible. Use consistent HTTP status codes:

- `400` invalid input.
- `401` unauthenticated.
- `403` unauthorized.
- `404` missing resource.
- `409` conflict.

## Pagination

Large list endpoints should support pagination with total counts. Defaults should be safe for production datasets.

## Filtering and Sorting

Use query parameters for filters and sorting. Document supported fields and ensure indexed backend access for high-volume queries.

## Document Link API

The document API is provider-independent and metadata-only:

| Endpoint | Purpose |
| --- | --- |
| `GET /documents/storage-providers` | Returns enum values and friendly labels. |
| `GET /documents/document-types` | Returns active document type reference values. |
| `GET /documents/categories` | Returns active category reference values. |
| `GET /projects/:projectId/documents` | Lists project documents with composed filters and sorting. |
| `GET /projects/:projectId/documents/summary` | Returns summary counts for dashboard cards. |
| `POST /documents` | Creates a project document link. |
| `PATCH /documents/:documentId` | Updates metadata for a document link. |
| `DELETE /documents/:documentId` | Soft-deletes a document link. |

Supported document filters include storage provider, approval status, document type, category, owner, review status, version, title search, and description search. Supported sorts include title, version, owner, created date, updated date, last reviewed, next review, and approval status.

`externalUrl` must validate as `http://` or `https://`. The API must not accept provider credentials, OAuth state, webhook data, provider-native file IDs, or synchronization payloads.

## Security

- Require JWT for protected endpoints.
- Enforce permissions server-side.
- Validate project visibility.
- Avoid returning data from projects the user cannot access.

## Future GraphQL Considerations

GraphQL may be useful for dashboard/report aggregation, but REST remains the primary API style until query complexity and client needs justify another contract.
