# ADR-009: Dependency Validation

## Status

Accepted

Date: 2026-07-08

Version:
v1.0.0-rc1

Decision Owner:
Ram Datla

Implementation:
Completed

Related ADRs:
- ADR-002 Planning Snapshot Architecture
- ADR-003 Planning Workspace

## Context

Dependency data drives scheduling correctness. Invalid dependencies can produce
wrong dates, impossible critical paths, or non-terminating calculations. The
engine needs to reject invalid graphs before forward pass, backward pass, float,
or critical path detection runs.

Dependencies also have enterprise semantics. Summary rows are containers, not
activities. Missing endpoints and cycles must be handled as scheduling errors,
not ignored silently.

## Decision

Dependency validation is owned by the graph builder and enforced before
calculation.

Validation rejects:

- Missing predecessor
- Missing successor
- Invalid dependency target
- Summary dependency endpoints
- Missing parent references
- Duplicate task IDs
- Unsupported task types
- Circular dependencies

Supported dependency types for new scheduling graphs are:

- Finish-to-Start (FS)
- Start-to-Start (SS)
- Finish-to-Finish (FF)

Start-to-Finish (SF) remains readable as legacy data but is ignored by new graph
construction.

## Consequences

- Invalid schedules fail before calculation.
- Forward and backward passes can assume topological order and valid endpoints.
- Error reporting can use structured validation issue codes.
- Summary tasks remain protected from ambiguous dependency semantics.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Validate in each pass | Duplicates validation and risks inconsistent behavior |
| Ignore missing endpoints | Hides data corruption and produces misleading schedules |
| Allow summary endpoints | Creates unclear constraints against rollup objects |
| Support SF in new graphs | Adds rare and confusing semantics before there is a clear product need |

## Related Documents

- [Graph Engine](../architecture/graph-engine.md)
- [Scheduling Engine](../architecture/scheduling-engine.md)
- [Critical Path Engine](../architecture/critical-path-engine.md)
