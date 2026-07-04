# ADR-001: Scheduling Engine Architecture

## Status

Accepted

## Context

Planning Engine v2 now has distinct internal services for graph construction,
forward pass, backward pass, float calculation, and critical path detection.
Calling these services independently would make future scheduling behavior hard
to govern and easy to duplicate.

Enterprise scheduling also needs clear separation between calculation logic,
API projection, persistence, and UI rendering. The platform must be able to add
calendars, constraints, baselines, resource leveling, and advisory features
without forcing every caller to understand the full calculation pipeline.

## Decision

The Scheduling Engine is structured as an internal orchestrated pipeline.

Callers use `PlanningScheduleEngineService` as the single entry point. The
orchestrator executes:

1. Graph Builder
2. Forward Pass
3. Backward Pass
4. Float Calculation
5. Critical Path Detection
6. ScheduleAnalysis assembly

The lower-level services remain independently testable, but callers should not
coordinate them directly unless they are unit tests or engine internals.

## Consequences

- Scheduling behavior has one entry point.
- The pipeline order is explicit and testable.
- Graph validation failures stop calculation before downstream passes run.
- Future services can be added to the orchestrator without changing external
  engine callers.
- REST APIs and UI components remain decoupled from internal calculation
  details.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Let callers invoke each engine service | Duplicates pipeline sequencing and increases risk of missed validation |
| Put all logic in one large service | Reduces testability and makes future algorithms harder to isolate |
| Expose schedule analysis directly through REST now | Premature API commitment before UX and persistence stories are complete |

## Related Documents

- [Scheduling Engine](../architecture/scheduling-engine.md)
- [Graph Engine](../architecture/graph-engine.md)
- [Forward Pass](../architecture/forward-pass.md)
- [Backward Pass](../architecture/backward-pass.md)
- [Float Engine](../architecture/float-engine.md)
- [Critical Path Engine](../architecture/critical-path-engine.md)
