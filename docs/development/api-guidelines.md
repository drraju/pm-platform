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

## Security

- Require JWT for protected endpoints.
- Enforce permissions server-side.
- Validate project visibility.
- Avoid returning data from projects the user cannot access.

## Future GraphQL Considerations

GraphQL may be useful for dashboard/report aggregation, but REST remains the primary API style until query complexity and client needs justify another contract.
