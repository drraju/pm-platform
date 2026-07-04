# Planning Engine v2 Scheduling Architecture

**Status:** Approved target architecture  
**Applies From:** Beta 3 planning modernization  
**Last Updated:** June 2026

## Purpose

Planning Engine v2 is the scheduling authority for the PM Platform. It defines the project Work Breakdown Structure (WBS), task types, schedule calculations, dependency behavior, rollups, Gantt rendering, editing rules, and future enterprise scheduling capabilities.

The design aligns with enterprise scheduling concepts used by Microsoft Project and Primavera while remaining pragmatic for the current platform.

## Current, Planned, and Future Scope

| Area | Current | Planned | Future |
| --- | --- | --- | --- |
| WBS hierarchy | Supported in Planning and Project Workspace | Shared hierarchy model across all modules | Portfolio WBS and templates |
| Task types | Standard, Summary, Milestone | Task, Summary, Milestone with categories | Work packages, constraints, templates |
| Summary rollups | Partial rollup in task views | Engine-owned rollup for dates, duration, progress, status | Calendar-aware and effort-weighted rollups |
| Milestones | Zero-duration validation exists | UI and API enforce equal start/finish automatically | Release train and deployment calendar |
| Dependencies | FS, SS, FF, SF storage | Enterprise editing and Gantt rendering | Lead/lag, constraints, cross-project dependencies |
| Critical path | Data structures exist | Calculation engine | Multiple paths and float analysis |
| Baselines | Baseline persistence exists | Baseline comparison in Planning | Portfolio baseline reporting |
| Calendars | Not implemented | Project calendar | Resource calendars and exceptions |

## Design Principles

1. Planning has one scheduling authority.
2. Summary tasks are calculated from children.
3. Milestones are zero-duration by design.
4. UI prevents invalid schedule input before backend validation.
5. WBS visibility does not change scheduling.
6. Reports and portfolio views consume calculated planning data rather than recalculating independently.
7. Future critical path, calendars, resources, and baselines must attach to the same model.

## Scheduling Authority

The Planning Engine is the single authoritative source for all scheduling information within the PM Platform.

Business modules consume scheduling information from the Planning Engine rather than calculating schedule data independently.

Modules using the Planning Engine include:

- Project Workspace
- Planning Workspace
- Tasks
- Portfolio
- Dashboard
- Reports
- AI Assistant (future)

The Planning Engine owns:

- Work Breakdown Structure (WBS)
- Task hierarchy
- Schedule calculations
- Summary rollups
- Milestone normalization
- Dependency validation
- Progress rollups
- Baselines
- Critical Path (future)
- Calendar calculations (future)

No frontend component, report, or downstream module should independently calculate scheduling information.

This ensures a single source of truth for scheduling across the platform.

## Planning Hierarchy

```text
Project
  |
  |-- Summary: Phase
  |     |
  |     |-- Summary: Workstream
  |     |     |
  |     |     |-- Task
  |     |     |-- Task
  |     |     |-- Milestone: Release
  |     |
  |     |-- Milestone: Decision Gate
  |
  |-- Summary: Phase
        |
        |-- Task
        |-- Milestone: Drop
```

## Task Types

The canonical model uses three primary task types.

| Task Type | Scheduling Meaning | Gantt Rendering | Manual Scheduling |
| --- | --- | --- | --- |
| Task | Executable work item | Standard bar | Yes |
| Summary | WBS container for child items | Summary bar/bracket | No |
| Milestone | Zero-duration event | Diamond | Date only; start and finish match |

Release and Drop are milestone categories, not separate primary task types.

## Summary Categories

Summary categories label the WBS container without changing schedule math.

| Category | Meaning |
| --- | --- |
| Phase | Major delivery stage |
| Workstream | Parallel area of work |
| Stage | Governance or lifecycle stage |
| Epic | Large delivery grouping |
| Custom | Organization-defined grouping |

## Milestone Categories

| Category | Meaning |
| --- | --- |
| Standard | General checkpoint |
| Release | Product or capability release |
| Drop | Deployment or delivery drop |
| Go Live | Production launch |
| Decision | Approval or governance gate |

## Scheduling Rules

### Task

Tasks may store:

- Start.
- Finish.
- Duration.
- Assignee.
- Status.
- Priority.
- Progress.
- Effort.
- Comments.

### Summary

Summaries derive:

- Start = earliest child start.
- Finish = latest child finish.
- Duration = derived schedule span.
- Progress = weighted child progress.
- Status = derived from child states.

Summaries cannot be manually assigned, manually scheduled, or manually progressed.

### Milestone

Milestones always have:

- Start = finish.
- Duration = 0.
- Diamond Gantt rendering.

When a milestone date changes, the UI and API set both start and finish to the same value.

## Rollup Rules

| Rollup | Rule |
| --- | --- |
| Start | Earliest dated descendant start |
| Finish | Latest dated descendant finish |
| Duration | Calendar span between rollup start and finish |
| Progress | Duration-weighted child task progress; effort-weighted when effort model is available |
| Status | Derived from child statuses using deterministic priority |

Average progress is not enterprise-grade for large plans and should only be used as a temporary fallback.

## Dependency Types

| Type | Meaning |
| --- | --- |
| FS | Finish-to-Start |
| SS | Start-to-Start |
| FF | Finish-to-Finish |
| SF | Start-to-Finish; deprecated for new mutations and retained only for stored-data compatibility |

Planned future dependency features:

- Lead and lag.
- Dependency validation.
- Circular dependency prevention.
- Cross-project dependencies.
- Dependency editing from Gantt.

## Dependency Lifecycle

Planning Engine v2 owns the task dependency graph for project scheduling.
Dependency create, update, delete, project listing, predecessor lookup, and
successor lookup are managed through the backend dependency lifecycle APIs.
This lifecycle validates graph integrity only; it does not propagate dates,
calculate float, or calculate Critical Path.

### Valid Dependency Endpoints

Valid endpoints:

- Standard tasks.
- Milestones, including categorized milestones such as Release, Drop, Go Live,
  and Decision.

Invalid endpoints:

- Summary tasks. Summaries are WBS containers and calculated rollup nodes, so
  they cannot be predecessors or successors.
- Missing task IDs.
- Soft-deleted task records.
- Tasks outside the current project dependency graph.

### Validation Rules

`SchedulingFoundationService` is the centralized dependency validation
authority. Project and planning services must delegate dependency integrity
checks to it rather than duplicating graph rules.

The validator rejects:

- Self dependencies.
- Duplicate active predecessor/successor relationships.
- Circular dependency graph mutations.
- Summary task predecessors.
- Summary task successors.
- Invalid or deleted task references.
- Unsupported dependency types for new mutations.

New dependency mutations support only FS, SS, and FF. Existing stored SF rows
remain readable for backward compatibility, but SF is deprecated and rejected
for new create/update operations.

### Dependency Graph Architecture

The active project dependency graph is represented as directed edges:

```text
predecessorTaskId -> successorTaskId
```

Validation builds an adjacency map from active dependencies, excludes the edge
being updated when applicable, adds the proposed edge in memory, and performs a
depth-first reachability check from the proposed successor back to the proposed
predecessor. If that path exists, the proposed mutation would create a cycle and
is rejected before persistence.

This keeps the algorithm linear in the size of the project graph:

```text
O(V + E)
```

where `V` is the number of task nodes reached during traversal and `E` is the
number of active dependency edges. This is suitable for current project-level
plans and can be optimized later with cached graph snapshots, indexed adjacency
reads, or incremental graph validation if project plans become very large.

### Future Compatibility

The lifecycle deliberately validates only the relationship graph today. The
model remains compatible with future additions without redesign:

- Lead and lag.
- External dependencies.
- Cross-project dependencies.
- Soft dependencies.
- Finish No Later Than constraints.
- Must Start On constraints.

Future scheduling stories can consume the validated graph for schedule
propagation, float, Critical Path, and constraint calculations.

## Gantt Rendering Standards

| Item | Rendering |
| --- | --- |
| Task | Solid bar, draggable, resizable |
| Summary | Calculated summary bar/bracket, read-only |
| Milestone | Diamond, draggable as a point |
| Release/Drop | Categorized milestone diamond with distinct label/icon |
| Dependency | Connector line using dependency type |
| Critical Path | Future red/critical styling |
| Baseline | Future ghost or comparison bar |

Collapsed summaries still render a summary row based on descendants.

## Editing Rules

| Field | Task | Summary | Milestone |
| --- | --- | --- | --- |
| Name | Editable | Editable | Editable |
| Start | Editable | Calculated | Date editor sets start and finish |
| Finish | Editable | Calculated | Date editor sets start and finish |
| Duration | Editable | Calculated | Always 0 |
| Assignee | Editable | Not assignable | Optional owner |
| Status | Editable | Calculated | Editable |
| Progress | Editable | Calculated | Usually 0 or 100 |
| Priority | Editable | Not applicable | Editable |

## Planning Toolbar

The toolbar should provide grouped actions:

```text
Tasks:      Add Task | Add Child | Add Summary | Add Milestone | Add Release/Drop | Delete
Schedule:   Dependencies | Today
Zoom:       Zoom Out | Zoom In | Fit
View:       Expand All | Collapse All | Time Scale | Filters | Help
```

Add Phase should be implemented as Add Summary with default category `Phase`.

## Planning Engine Responsibilities

- Maintain WBS ordering.
- Validate task type rules.
- Normalize milestone dates.
- Derive summary schedule fields.
- Persist schedule snapshots.
- Supply Gantt-ready data.
- Own dependency validation and future critical path calculation.
- Supply report and portfolio-ready planning facts.

## Scheduling Authority

Planning Engine is the authority for schedule calculations. Other modules may display, filter, or report planning data, but they should not recalculate schedule semantics independently.

```text
Task Updates -> Planning Engine -> Calculated Schedule -> UI / Reports / Portfolio / AI
```
## Data Ownership

To avoid conflicting scheduling information, every scheduling attribute has a single authoritative owner.

### Task owns

Business information.

Examples:

- Name
- Description
- Priority
- Status
- Assignee
- Comments
- Attachments

### Planning Engine owns

Scheduling information.

Examples:

- Planned dates
- Scheduled dates
- Duration
- Dependencies
- Rollups
- Float
- Critical Path
- Baselines
- Calendars
- Sequence
- WBS hierarchy

Business modules reference scheduling data from the Planning Engine rather than storing duplicate scheduling values.

The Task entity must not become an independent scheduling engine.

## Future Features

- Critical path and float.
- Baseline comparison.
- Project calendars.
- Resource calendars.
- Constraints.
- Lead/lag.
- Portfolio Gantt.
- AI schedule risk prediction.

## Roadmap

| Phase | Outcome |
| --- | --- |
| Beta 3 | Stabilize Planning Workspace, WBS, expand/collapse, task type semantics |
| Beta 4 | Critical path, baseline comparison, calendars foundation |
| Beta 5 | Resource management and workload-aware planning |
| Beta 6 | Portfolio scheduling and cross-project dependencies |

## Architectural Decisions

- [ADR-001 Planning Engine](../adr/ADR-001-Planning-Engine.md)
- [ADR-003 Scheduling Authority](../adr/ADR-003-Scheduling-Authority.md)
