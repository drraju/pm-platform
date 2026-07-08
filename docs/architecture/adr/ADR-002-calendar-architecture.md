# ADR-002: Calendar Architecture

## Status

Accepted.

## Context

Epic 1.1 introduced Enterprise Calendar foundations. The current implementation includes Enterprise Calendar persistence, exceptions, REST API, and administration UI. The approved roadmap includes future Project Calendars, Resource Calendars, and effective calendar inheritance.

## Decision

Calendar architecture is an administrative domain that stores calendar metadata:

- Enterprise calendars.
- Working days.
- Working hours.
- Holidays.
- Exception days.

Calendars do not perform scheduling calculations and do not mutate Planning schedules.

## Consequences

- Calendar CRUD can evolve safely without destabilizing the Scheduling Engine.
- Scheduling integration requires a future Planning/SchedulingContext design.
- Calendar API/UI can be delivered independently from calendar-aware scheduling.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Calendar logic inside Scheduling Engine | Would couple persistence/admin data to deterministic CPM services. |
| Direct schedule mutation from CalendarService | Violates scheduling authority and creates hidden side effects. |
| Implement full inheritance immediately | Larger blast radius; current roadmap implements incrementally. |

## Future Implications

Project and Resource Calendars should inherit from Enterprise Calendar through explicit services. Effective calendar resolution should feed Planning through approved adapters, not direct engine imports.

