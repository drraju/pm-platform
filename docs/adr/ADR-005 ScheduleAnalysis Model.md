# ADR-005: ScheduleAnalysis Model

## Status

Accepted

## Context

The scheduling engine produces multiple related outputs: graph structure,
topological order, early dates, late dates, float, and critical flags. Returning
these as separate service outputs forces callers to stitch schedule facts
together repeatedly.

At the same time, the engine is not ready to expose a public REST contract or
persist every calculated value as part of CP-5.5.

## Decision

The scheduling orchestrator returns an internal immutable `ScheduleAnalysis`
object.

The model includes:

- Project summary counts
- Graph counts
- Topological order
- Node-level schedule facts
- Validation messages

Node-level facts include:

- Task ID
- Task type
- Parent ID
- Children
- Early Start / Early Finish
- Late Start / Late Finish
- Total Float / Free Float
- Critical flag

Summary rows remain present for WBS context but have schedule fields set to
`null`.

## Consequences

- Internal callers receive a single coherent analysis snapshot.
- Downstream API projection can be designed later without leaking engine
  internals.
- Tests can verify the complete pipeline output.
- Future persistence stories can map from `ScheduleAnalysis` into schedule
  snapshots deliberately.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Return raw maps from every engine service | Forces callers to merge data and risks inconsistent interpretation |
| Persist analysis immediately | Premature before schedule propagation and snapshot stories are defined |
| Expose ScheduleAnalysis directly through REST | Freezes an internal model as a public contract too early |

## Related Documents

- [Scheduling Engine](../architecture/scheduling-engine.md)
- [Graph Engine](../architecture/graph-engine.md)
- [Float Engine](../architecture/float-engine.md)
