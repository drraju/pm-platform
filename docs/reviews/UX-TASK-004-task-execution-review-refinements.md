# UX-TASK-004 Task Execution Review UX Refinements

## Architecture Review

- No new entities or database tables were added.
- `Task` remains the current state for owner, status, progress, and priority.
- `TaskExecutionUpdate` remains the immutable execution history for next step, next action owner, target date, notes, and change details.
- Execution history remains lazy-loaded only when the drawer opens.
- The execution grid continues to use only `latestExecutionUpdate`; no N+1 history loading was introduced.

Blocker category is stored inside the existing execution update notes with a structured `Blocker Category:` prefix. This keeps the refinement inside the current execution update framework while allowing the grid to show a meaningful blocked label from the latest update.

## Implementation Summary

- Next Action Owner now uses active project members from the project member data source.
- Inactive project members are excluded from owner selection lists.
- Blocked grid display now shows the blocker category, for example `Waiting for Customer`; unblocked tasks show `-`.
- The execution drawer is separated into `Current Task State`, `Today's Execution Update`, and `Recent Execution History`.
- Progress editing now uses a slider paired with a validated numeric field.
- Status/progress validation prevents inconsistent combinations:
  - Todo requires 0%.
  - Done requires 100%.
  - In Progress requires 1-99%.
  - Blocked allows any 0-100 progress value.
- Next Step is required when status, progress, or priority changes.
- Blocked updates require both Blocker Category and Blocker Reason.
- Last Updated now shows compact date plus updated-by name from the latest execution update.
- Recent history cards show date, updater, progress change, priority change, next step, and notes.
- The row action label is `Update`, which is clearer for daily task execution than `Review` because the primary workflow records a new execution update.

## Manual Verification Checklist

1. Open Project -> Tasks in Execution Review mode.
2. Confirm the action button reads `Update`.
3. Open a task update drawer.
4. Confirm Current Task State is read-only and separate from Today's Execution Update.
5. Confirm Next Action Owner lists every active project member.
6. Confirm inactive project members are not selectable.
7. Change Task Owner and confirm Next Action Owner remains independent.
8. Mark the task blocked.
9. Confirm Blocker Category and Blocker Reason are required.
10. Save a blocked update with category `Waiting for Customer`.
11. Confirm the grid Blocked column shows `Waiting for Customer`.
12. Unblocked tasks should show `-` in the Blocked column.
13. Set Todo with progress above 0 and confirm validation blocks save.
14. Set Done below 100 and confirm validation blocks save.
15. Set In Progress to 0 or 100 and confirm validation blocks save.
16. Change status, progress, or priority without Next Step and confirm validation blocks save.
17. Confirm Last Updated shows date and updated-by name.
18. Confirm Recent Execution History renders compact read-only cards.
19. Confirm history still loads only after opening the drawer.
20. Confirm desktop and mobile drawer layouts remain readable.

## Test Coverage

- Project member list for Next Action Owner.
- Inactive member exclusion.
- Blocked category and reason validation.
- Status/progress consistency validation.
- Required Next Step when execution state changes.
- Last Updated date and updated-by display.
- Execution history card rendering.
- Existing execution update submission regression.
