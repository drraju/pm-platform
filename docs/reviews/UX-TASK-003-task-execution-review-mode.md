# UX-TASK-003 Task Execution Review Mode

## Architecture Review

Execution Review reuses the UX-TASK-001/002 architecture:

- `Task` remains the current execution snapshot for status, progress, priority, and owner.
- `TaskExecutionUpdate` remains the immutable execution history.
- Latest next step continues to come from `task.latestExecutionUpdate`.
- Full history is lazy-loaded only when the review drawer opens.
- No new database entities were introduced.
- No `nextStep` or blocker field was added to `Task`.

Blocked state uses the existing task status value `blocked`. Blocker reason is captured as execution update notes so it remains historical and does not duplicate current task state.

## Implementation Summary

- Project Tasks now has a Planning View / Execution Review mode switch.
- Planning View keeps planning columns and inline planning maintenance.
- Execution Review shows execution-only columns: WBS, task name, owner, status, progress, priority, next step, blocked, last updated, and actions.
- Execution Review rows use a single `Update` action that opens the existing Task Execution Update drawer.
- The drawer now supports blocked review, blocker reason, previous/next task navigation, and recent execution history.
- Recent history is fetched through `GET /tasks/:id/execution-updates` when the drawer opens.
- Saving an update appends a `TaskExecutionUpdate` and advances to the next reviewable task when available.
- ESC closes the drawer and focus returns to the reviewed task action.

## Manual Verification Checklist

1. Open Project -> Tasks.
2. Confirm `Execution Review` is selected by default.
3. Switch to `Planning View` and confirm planning columns remain available.
4. Switch back to `Execution Review`.
5. Confirm planning-only columns are hidden.
6. Confirm execution columns show status, progress, priority, next step, blocked, and last updated.
7. Select `Update` for a task.
8. Confirm the existing execution update drawer opens.
9. Confirm recent execution history loads for that task only.
10. Change priority and next step.
11. Mark the task blocked and enter blocker reason.
12. Reassign owner and enter update notes.
13. Save update.
14. Confirm task status/priority/progress update.
15. Confirm latest next step appears in the grid.
16. Confirm history remains read-only.
17. Use `Next Task` and `Previous Task` inside the drawer.
18. Press ESC and confirm the drawer closes.
19. Confirm keyboard tab order moves through drawer fields logically.
20. Confirm mobile drawer occupies the available screen width.

## Performance Notes

The task grid uses the existing optimized latest-update projection. It does not load complete task history. History is fetched only for the active review task, with a capped recent-update query.
