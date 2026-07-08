# ADR-006: Summary Task Semantics

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

Summary rows are necessary for WBS organization, but they can become confusing
if treated like executable tasks. Enterprise schedulers expect summaries to
derive dates and progress from descendants while leaf tasks and milestones
drive the actual schedule.

The platform also needs predictable dependency rules. Allowing dependencies on
summary rows creates ambiguous schedule constraints because summaries represent
groups, not activities.

## Decision

Summary tasks are WBS containers and rollup objects.

Summary tasks:

- May contain tasks, summaries, and milestones.
- Do not receive direct dependency endpoints.
- Are skipped by forward pass, backward pass, float calculation, and critical
  path detection.
- Derive dates, progress, and status from descendants through rollup logic.
- Are never marked critical directly.

## Consequences

- Scheduling calculations operate only on executable work and milestones.
- Dependency validation can reject summary endpoints.
- UI can present summaries as organizational rows with read-only calculated
  fields.
- Critical child work may appear under a summary, but the summary itself is not
  a critical activity.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Schedule summaries as normal tasks | Double-counts duration and creates ambiguous dependencies |
| Allow dependencies on summaries | Unclear whether constraint applies to start, finish, or all descendants |
| Remove summaries from analysis entirely | Loses WBS context needed by callers and reports |

## Related Documents

- [Graph Engine](../architecture/graph-engine.md)
- [Forward Pass](../architecture/forward-pass.md)
- [Backward Pass](../architecture/backward-pass.md)
- [Critical Path Engine](../architecture/critical-path-engine.md)
