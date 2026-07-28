# UX-TASK-002 Task Priority & Next Step Enhancement

## Architecture Review

The existing UX-TASK-001 model already supports this enhancement:

- `Task.priority` remains the current task snapshot.
- `TaskExecutionUpdate.priority` records the priority value at the time of each execution update.
- `TaskExecutionUpdate.changes.priority` stores previous and new priority values.
- `TaskExecutionUpdate.nextStep`, `targetCompletionDate`, and `updateNotes` store execution progress history.
- No `nextStep` column is added to `tasks`.
- No new database entity or endpoint is introduced.

## Implementation Summary

- The Tasks page now displays a `Next Step` column using `task.latestExecutionUpdate.nextStep`.
- Project workspace task grids also display the latest next step.
- Empty latest next step renders as `—`.
- Long next-step text is constrained to one line with truncation and a tooltip containing the full value.
- Latest execution updates are loaded with a PostgreSQL `DISTINCT ON` query, returning only the newest update per task instead of loading full history for every task.
- Execution update save behavior continues to update the current `Task` snapshot and append a new immutable `TaskExecutionUpdate`.

## Manual Verification Checklist

1. Open a project task workspace.
2. Select a standard task and open the execution update drawer.
3. Change status, progress, and priority.
4. Add a next step.
5. Add target completion date and update notes.
6. Save the update.
7. Confirm task priority changes immediately.
8. Confirm latest next step appears in the task grid.
9. Confirm long next-step text truncates to one line.
10. Hover over next step and confirm the full value is available in the tooltip.
11. Add another execution update with a different next step.
12. Confirm the grid displays only the newest next step.
13. Confirm prior execution updates remain unchanged in history.
14. Open `/tasks` and confirm My Tasks/All Visible Tasks display the latest next step.
15. Confirm sorting and filtering still work.
16. Confirm no additional per-task history requests are made by the page.

## Regression Coverage

- Backend unit tests cover priority history capture and optimized latest-update loading.
- Frontend tests cover latest next-step display, empty values, truncation class, and tooltip.
- Existing task update and execution update tests remain in place.
