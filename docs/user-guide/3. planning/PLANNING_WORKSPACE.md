# Planning Workspace

## Purpose

Provide an outline for using the PM Platform Planning Workspace.

## Scope

This guide covers schedule review, task tree navigation, Gantt usage, dependency management, critical path indicators, and resource allocation overlays.

## Audience

Project managers, planners, delivery leads, PMO analysts, and executives reviewing project delivery schedules.

## Overview

The Planning Workspace is the project schedule surface. It combines a hierarchical task tree with a Gantt timeline, dependency controls, critical path indicators, and early resource allocation visibility.

## Contents

### Introduction

Use the Planning Workspace to inspect and adjust a project schedule. The current workspace is a planning foundation; deeper scheduling validation and enterprise resource calculations are planned in the Planning Engine stabilization release.

### Prerequisites

- Access to the target project.
- Permission to update tasks or planning data for schedule edits.
- Existing project tasks with planned dates for useful Gantt visualization.

### Step-by-step Usage

1. Open a project.
2. Navigate to the Planning Workspace.
3. Review the schedule summary at the top of the page.
4. Expand or collapse summary tasks in the tree grid.
5. Use zoom controls to switch day, week, or month scale.
6. Drag task bars where schedule editing is permitted.
7. Create dependencies by selecting predecessor, successor, and dependency type.
8. Delete dependencies where corrections are required.
9. Review critical path highlights and resource allocation overlays.

### Critical Path Visualization

The Planning Workspace can visualize calculated Scheduling Engine results.

Use the View menu to enable **Show Critical Path**. When enabled:

- Critical task bars remain visible with distinct red styling.
- Summary bars remain visible for WBS context.
- Non-critical task bars are hidden from the Gantt timeline.
- Milestones remain visible only when they are critical.

The grid remains available so users can still review the full WBS while focusing
the timeline on critical work.

### Float Columns

Schedule analysis columns are hidden by default. Use either the Columns menu or
the View menu option **Show Float Columns** to display:

- ES
- EF
- LS
- LF
- Total Float
- Free Float
- Critical

Summary rows are rollup rows, so schedule analysis values are blank. Milestones
display schedule analysis values normally.

Tooltips explain the float fields:

- Total Float: time the task may slip before affecting project completion.
- Free Float: time the task may slip before delaying its successor.
- Critical: zero total float.

### Screenshots

Placeholder:

```text
[Screenshot: Planning workspace header]
[Screenshot: Task tree and Gantt timeline]
[Screenshot: Dependency creation panel]
[Screenshot: Critical path highlight]
```

### Troubleshooting

| Issue | Recommended Action |
| --- | --- |
| Gantt bar is missing | Confirm planned start and finish dates exist. |
| Summary task cannot be dragged | Summary rows are containers and should roll up from children. |
| Dependency cannot be created | Confirm the predecessor and successor are valid non-summary tasks and do not create a cycle. |
| Critical path looks unexpected | Confirm dependencies and durations are correct; critical flags come from calculated total float. |
| Large schedule feels slow | Virtualization and lazy loading are planned improvements. |

### FAQ

| Question | Answer |
| --- | --- |
| Does dragging a bar update execution tasks directly? | The workspace uses planning schedule records; task synchronization rules should be confirmed by release behavior. |
| Are all dependency types supported? | FS, SS, FF, and SF are modeled; UI support may be phased. |
| Is resource leveling available? | Not yet. Resource Management depends on Planning Engine stabilization. |

## Related Documents

- [v1.1.0 Planning Workspace](../architecture/v1.1.0-planning-workspace.md)
- [v1.1.1 Planning Engine](../architecture/v1.1.1-planning-engine.md)
- [Planning Engine Roadmap](../architecture/planning-engine-roadmap.md)
- [Product Roadmap](../roadmap/README.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created planning workspace user-guide outline. |
