# ADR-002: WBS Model

## Status

Accepted

## Context

Enterprise planning requires a stable Work Breakdown Structure (WBS) for
organizing work. The same hierarchy must support Planning, Tasks, reporting,
timeline visualization, dependency validation, and future baselines.

Earlier product language used overlapping concepts such as phase, task kind,
plan item, and summary. This created ambiguity about whether a row represented
executable work or a container.

## Decision

The WBS is modeled as a parent-child hierarchy of planning items.

Primary row types are:

- `Summary`: organizational container
- `Task`: executable work item
- `Milestone`: zero-duration scheduling event

WBS numbering is derived from hierarchy and sibling order. It is not the source
of truth for relationships. Parent IDs and sequence/order values define the
structure.

## Consequences

- WBS can represent nested summaries and deep project structures.
- Tasks and milestones can appear under summaries.
- Summary rows provide organization but are not executable work.
- WBS labels can be recalculated when rows are reordered.
- Future baselines can snapshot both hierarchy and schedule facts.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Flat task list with tags | Cannot model enterprise WBS hierarchy well |
| Separate Phase entity as primary hierarchy | Creates duplicate semantics with Summary |
| Store WBS code as the authoritative parent relation | Fragile during reordering and renumbering |

## Related Documents

- [Planning Engine v2](../architecture/planning-engine-v2.md)
- [Planning Toolbar](../architecture/planning-engine/planning-toolbar.md)
- [Project Workspace](../architecture/project-workspace.md)
