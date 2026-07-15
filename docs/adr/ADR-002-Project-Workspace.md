# ADR-002: Project Workspace

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

Project work spans overview, planning, tasks, RAID, team, documents, and reports. A fragmented project experience causes duplicated context loading, inconsistent permissions, and confusing navigation.

## Decision

The Project Workspace is the canonical project-level operating surface. All project-scoped modules share project header context, tabs, team membership, and permission-aware actions.

## Consequences

- Project context is consistent across modules.
- Project tabs become the primary navigation model.
- Team membership becomes the assignment source for Planning, Tasks, and RAID.
- Overview must preserve the same WBS hierarchy used by Planning and Tasks.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Separate standalone project pages | Fragmented context and repeated data loading |
| Dashboard-only project management | Insufficient for execution workflows |
| Module-specific team/assignment lists | Duplicates user management and causes drift |

## Future Impact

This decision supports customer success views, project settings, reports, documents, resource planning, and AI project manager panels.

## Related Documents

- [Project Workspace](../product/workspaces/PROJECT_WORKSPACE.md)
- [Planning Engine v2](../architecture/planning-engine-v2.md)
