# ADR-008: Calendar Assignment

## Status

Proposed for Epic 1.2.

## Context

Epic 1.1 introduced Enterprise Calendar administration. Epic 1.2 requires resource calendar assignment and future inheritance across user, team, project, and organization defaults.

## Decision

Calendar assignment uses precedence:

```text
User Calendar
  -> Team Calendar
    -> Project Calendar
      -> Organization Default Calendar
```

The effective calendar is the most specific available calendar. In Epic 1.2, calendar assignment is administrative metadata and availability context; it does not mutate schedules.

## Alternatives

| Alternative | Rejected Because |
| --- | --- |
| One global calendar only | Cannot represent team/user availability differences. |
| Resource calendar overrides scheduling directly | Violates Scheduling Engine isolation. |
| Duplicate calendar definitions per resource | Causes drift and maintenance overhead. |

## Consequences

- Effective calendar resolution can be tested independently.
- Planning integration can be introduced later through approved adapters.
- Calendar ownership remains in Calendar domain.

## Future Impact

v1.3 may extend SchedulingContext to include effective calendar information, but only through Planning and with Scheduling Engine regression tests.

