# ADR-004: Milestone Categories

## Status

Accepted

## Context

Projects need milestone semantics for delivery events such as releases, drops,
go-live dates, and decisions. These labels matter for reporting and user
communication, but they should not create separate scheduling algorithms.

The system must distinguish milestone category from task type. A release is a
kind of milestone, not a separate executable work model.

## Decision

Milestones are a primary planning item type with optional category metadata.

Supported categories include:

- Standard
- Release
- Drop
- Go Live
- Decision

All milestone categories share the same scheduling behavior:

- Duration is zero.
- Early Finish equals Early Start.
- Late Finish equals Late Start.
- Milestones may participate in dependencies.
- Milestones may be critical when Total Float is zero.

## Consequences

- Reporting can group milestones by category without changing schedule logic.
- Toolbar creation can offer meaningful business labels.
- Future release/drop/go-live reporting can use category fields.
- Scheduling services remain simpler because all categories use the same
  zero-duration rule.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Separate task types for Release, Drop, Go Live, Decision | Expands scheduling type complexity without algorithmic benefit |
| Model milestones as normal zero-duration tasks only | Loses business semantics needed for reporting and UX |
| Hard-code category-specific scheduling rules | Premature and difficult to explain consistently |

## Related Documents

- [Planning Toolbar](../architecture/planning-engine/planning-toolbar.md)
- [Forward Pass](../architecture/forward-pass.md)
- [Backward Pass](../architecture/backward-pass.md)
- [Critical Path Engine](../architecture/critical-path-engine.md)
