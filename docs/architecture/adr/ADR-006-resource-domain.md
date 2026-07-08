# ADR-006: Resource Domain

## Status

Proposed for Epic 1.2.

## Context

The platform currently has Users for identity and planning resource capacity/allocation foundations for `user` and `team` units. It does not yet have a standalone Resource aggregate.

## Decision

Introduce Resource as a first-class domain separate from User. A Resource Profile may optionally reference a User, but it must also support non-user resources.

## Alternatives

| Alternative | Rejected Because |
| --- | --- |
| Treat User as Resource | Excludes contractors without login, equipment, facilities, vehicles, and generic resources. |
| Keep resource data only inside Planning | Prevents cross-project resource governance and search. |
| Model only teams | Too coarse for assignment and skills workflows. |

## Consequences

- Resource Management can evolve independently from Auth.
- Existing planning allocations can migrate toward Resource references over time.
- New permissions are likely needed.
- Data model must support optional user link and non-human resource types.

## Future Impact

Resource becomes the foundation for v1.3 scheduling context integration, v1.5 capacity planning, and v2 AI resource recommendations.

