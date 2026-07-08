# ADR-004: API Design

## Status

Accepted.

## Context

The backend exposes REST APIs through NestJS controllers. Existing modules use JWT guards, permission guards, DTOs, class-validator, Swagger decorators, TypeORM repositories, and Nest exceptions.

## Decision

REST APIs should follow these rules:

- Controllers are thin and guarded.
- Request payloads use DTOs.
- Public responses use DTOs where the feature defines them.
- Services own validation and business behavior.
- Services use repositories instead of ad hoc persistence access.
- Errors use platform exception style: 400, 403, 404, 409, 422 as appropriate.
- Existing routes remain backward compatible.

## Consequences

- API behavior is predictable and testable.
- Swagger documentation remains close to controller code.
- DTO boundaries make it safer to evolve persistence.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| GraphQL | Current platform is REST-based and API contracts already exist. |
| Entity-first API responses everywhere | Leaks persistence shape and sensitive fields. |
| Business logic in controllers | Reduces testability and breaks module layering. |

## Future Implications

Future APIs for resources, capacity, Gantt, and AI should use the same controller/DTO/service/repository structure.

