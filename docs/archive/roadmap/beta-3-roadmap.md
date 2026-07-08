# Beta 3 Roadmap

## Objective

Beta 3 focuses on making the Project Workspace and Planning Workspace credible for broader UAT. The release should convert current planning functionality into a consistent execution experience.

## Planning

- Stabilize WBS hierarchy.
- Align task type model around Task, Summary, and Milestone.
- Treat Phase as a Summary category.
- Treat Release/Drop as Milestone categories.
- Improve Gantt usability and row editing.
- Prevent invalid milestone input in the UI.

## Project Workspace

- Keep Overview, Planning, Tasks, RAID, Team, Documents, and Reports aligned.
- Ensure Overview preserves hierarchy.
- Use project team membership consistently for assignment and ownership.

## Scheduling

- Clarify Planning Engine as scheduling authority.
- Define summary rollup rules.
- Prepare for critical path and baselines without implementing them prematurely.

## Remaining Features

| Feature | Beta 3 Scope |
| --- | --- |
| Task type semantics | Design and staged implementation |
| Planning toolbar | Productivity-focused grouping |
| Reports | Project-level report foundation |
| RAID | Project owner/status/priority consistency |
| Team | Member visibility and project role support |

## Acceptance Criteria

- Planning and Tasks use consistent WBS and task type language.
- Summary tasks are visibly calculated.
- Milestones cannot be entered with invalid date spans.
- Project Workspace modules preserve project context.
- UAT can validate planning without requiring backend intervention.

## Release Goals

- Reduce UAT confusion.
- Establish enterprise scheduling vocabulary.
- Prepare cleanly for Beta 4 scheduling depth.
