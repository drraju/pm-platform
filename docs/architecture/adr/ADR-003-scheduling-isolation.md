# ADR-003: Scheduling Isolation

## Status

Accepted.

## Context

The Scheduling Engine is production-stable and used by Planning. It contains graph building, forward pass, backward pass, float, and critical path services. A `SchedulingContextFactory` adapts Planning data into a `SchedulingContext`.

## Decision

The Scheduling Engine remains isolated:

- It accepts `SchedulingContext`.
- It does not access persistence.
- It does not import Calendar or Resource entities.
- It does not expose public SchedulingContext APIs.
- It owns CPM, float, and critical path only.

## Consequences

- Scheduling behavior is deterministic and testable.
- Domain services cannot accidentally alter scheduling calculations.
- Future calendar/resource integration must be designed through Planning.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Engine reads tasks/dependencies from repositories | Makes calculations harder to test and couples engine to persistence. |
| Engine imports Calendar entities | Blurs calendar administration and scheduling authority. |
| Public SchedulingContext API | Exposes an internal adapter and freezes implementation too early. |

## Future Implications

Calendar-aware or resource-aware scheduling should extend the context contract only after an ADD and regression tests. The default stance is no scheduling mutation from administrative domains.

