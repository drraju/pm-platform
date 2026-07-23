# UAT Beta 4.0

## Purpose

Validate the Beta 4.0 planning and scheduling experience before release.

Beta 4.0 focuses on Planning Engine v2 scheduling depth, including schedule
analysis, float, critical path detection, and Planning Workspace visualization.

## Scope

In scope:

- Planning Workspace loading.
- WBS hierarchy display.
- Summary, Task, and Milestone behavior.
- Dependency-aware schedule analysis.
- Early Start and Early Finish.
- Late Start and Late Finish.
- Total Float and Free Float.
- Critical Path indicators.
- Planning Workspace critical path and float column visualization.

Out of scope:

- Baselines.
- Calendars.
- Resource leveling.
- AI scheduling.
- Portfolio-level critical path.
- Schedule propagation.

## Test Roles

| Role | Focus |
| --- | --- |
| Project Manager | Planning workspace, task edits, dependencies, critical path review |
| PMO Analyst | Float columns, reporting consistency, schedule validation |
| Executive | Overview readability and critical project status |
| Team Member | Read-only task context and navigation |

## Test Data

Use projects with:

- A small schedule with 5-10 planning rows.
- A medium schedule with 25-75 planning rows.
- A large schedule with 100+ planning rows.
- Nested summaries.
- Milestones including Release, Drop, Go Live, and Decision.
- At least one linear dependency chain.
- At least one parallel dependency path.
- At least one merge milestone.
- At least one non-critical branch with positive float.

## UAT Scenarios

### 1. Planning Workspace Loads

Steps:

1. Open a project.
2. Navigate to Planning.
3. Confirm the planning grid and timeline load.
4. Confirm frozen grid and scrollable timeline still behave correctly.

Expected:

- Workspace loads without errors.
- Existing fields remain visible.
- No backend or UI console errors block use.

### 2. Schedule Analysis Fields

Steps:

1. Open the View menu.
2. Select Show Float Columns.
3. Review ES, EF, LS, LF, Total Float, Free Float, and Critical columns.

Expected:

- Executable tasks show schedule analysis values.
- Milestones show schedule analysis values.
- Summary rows show blank schedule analysis values.
- Existing grid columns remain configurable.

### 3. Critical Path Visualization

Steps:

1. Open the View menu.
2. Select Show Critical Path.
3. Review the Gantt timeline.

Expected:

- Critical task bars remain visible with distinct styling.
- Summary bars remain visible for context.
- Non-critical task bars are hidden.
- Critical milestones remain visible.
- Non-critical milestones are hidden.

### 4. Dependency Validation

Steps:

1. Review a project with FS, SS, and FF dependencies.
2. Confirm schedule analysis values reflect the dependency graph.
3. Attempt to identify invalid dependency patterns from seeded data.

Expected:

- Valid graphs analyze successfully.
- Invalid graph conditions are rejected before calculation.
- Summary rows are not dependency endpoints.

### 5. Milestone Behavior

Steps:

1. Review Standard, Release, Drop, Go Live, and Decision milestones.
2. Confirm milestone date and schedule analysis values.
3. Confirm critical milestones are highlighted when appropriate.

Expected:

- Milestones use zero duration.
- ES equals EF.
- LS equals LF.
- Critical milestones are visible with Show Critical Path enabled.

### 6. Regression Coverage

Steps:

1. Add, edit, and reorder planning rows where permissions allow.
2. Expand and collapse summaries.
3. Zoom and scroll the timeline.
4. Toggle Grid Only, Timeline Only, and Grid + Timeline.

Expected:

- Existing Planning Workspace behavior remains stable.
- No scheduling visualization changes break editing, scrolling, or layout.

## Exit Criteria

Beta 4.0 UAT can pass when:

- No critical or high-severity open defects remain.
- Planning Workspace loads reliably.
- Schedule analysis fields are visible and understandable.
- Critical Path toggle behaves as designed.
- Summary rows remain rollup-only.
- Milestones behave as zero-duration scheduling events.
- Full automated test and build gates pass.

## Sign-off

| Area | Owner | Status | Notes |
| --- | --- | --- | --- |
| Planning Workspace |  | Not Started |  |
| Scheduling Engine |  | Not Started |  |
| Critical Path Visualization |  | Not Started |  |
| Regression Testing |  | Not Started |  |
| Release Readiness |  | Not Started |  |
