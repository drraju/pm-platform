# UX-TASK-006 Daily Review Workspace

## Repository Investigation

The existing execution workflow is implemented by `ProjectWorkspaceTasks` and is used by the project Tasks and Execution routes. The component already owns execution validation, history loading, the execution update drawer, and automatic navigation to the next reviewable task after a successful save. Task mutations are provided by the existing `updateProjectTask` and `recordProjectTaskExecutionUpdate` APIs.

The application shell defines top-level navigation in `frontend/components/layout/app-navigation.ts`, while workspace context breadcrumbs are derived in `workspace-context.tsx`. Project discovery is already available through `getProjects`, and project details include the task queue and project members.

## UX Decisions

Daily Review is an additive `/daily-review` workspace. The existing project Execution workspace remains unchanged and continues to be available from each project.

The new workspace is workflow-first:

- A searchable project field and compact project selector sit at the top of the page.
- Project metadata shows active task count and sprint availability without a large header or dashboard treatment.
- A single compact widget row acts as navigation filters for Overdue, Due Today, Due This Week, Blocked, Updated Today, Waiting For Me, and Escalations.
- Filter chips remain in a sticky toolbar so the execution queue stays usable while scrolling.
- The task queue is ordered by overdue work, due today, due this week, blocked work, waiting-for-action work, then remaining active work. Priority and title provide deterministic tie-breakers.
- The existing execution drawer provides Save & Next behavior. On the last task, the workspace shows Daily Review Complete with review, update, blocked, and escalation counts.

## UX-TASK-006A Refinements

The Daily Review route was tightened for standup use without changing the existing execution workflow:

- Removed the redundant execution filter panel and header description from the shared task surface when composed by Daily Review.
- Added a compact sticky queue toolbar with task search, filter chips, and `Reviewed N / Total` session progress.
- Search filters the visible execution queue immediately by task name without navigation or an Apply action.
- Review progress is session-only and increments once after a successful execution update for each task.
- Kept the project header limited to project selection, sprint availability, and active task count.
- Preserved the existing widget filter behavior and delivery-priority ordering.

The existing Save & Next, Save & Finish, and completion behavior from the initial Daily Review implementation was preserved as existing execution behavior; this refinement does not add new modal or backend workflow logic.

## Data Consistency Fix

Daily Review summary widgets count executable tasks after excluding summary rows. `ProjectWorkspaceTasks`, however, renders a hierarchy from root tasks and `parentTaskId` relationships. For projects whose executable tasks were children of a summary task, passing only the executable rows orphaned those children and produced an empty grid while the widgets still showed counts.

The queue now preserves the required summary ancestors only for grid rendering. Widget counts and execution filters continue to use executable tasks, while the shared task component receives the minimum hierarchy context needed to render them.

## Workflow Comparison

The project Execution workspace is project-centric and is best for broader project execution management. Daily Review is operational: a Project Manager opens one top-level route, selects a project, applies a standup filter, reviews tasks in delivery order, and completes the queue without leaving the workspace.

## Components Reused

- `ProjectWorkspaceTasks` for the execution grid, modal, validation, history, and update sequencing.
- `getProjects`, `getProject`, `getProjectMembers`, `updateProjectTask`, and `recordProjectTaskExecutionUpdate` for existing data and mutation contracts.
- `getTaskExecutionUpdates` for execution history.
- `WorkspaceContent`, `WorkspaceSection`, `LoadingState`, `ErrorState`, and `EmptyState` for the established workspace states.
- Existing application sidebar and workspace context infrastructure.

## Architecture Impact

This is a frontend composition change. No backend APIs, database schema, scheduling engine, planning workspace, calendar, RBAC definitions, or authentication flows were changed. `ProjectWorkspaceTasks` gained two optional frontend-only capabilities: a delivery-order comparator and a completion callback. Existing consumers retain their previous behavior.

## Files Changed

- `frontend/app/(app)/daily-review/page.tsx`: new top-level Daily Review workspace.
- `frontend/components/layout/app-navigation.ts`: adds Daily Review navigation.
- `frontend/components/layout/workspace-context.tsx`: adds Daily Review workspace context.
- `frontend/components/projects/project-workspace-tasks.tsx`: supports queue ordering and completion reporting while preserving existing execution behavior.
- `frontend/tests/navigation.test.tsx`: verifies the Daily Review navigation link.
- `frontend/tests/projects-page-navigation.test.tsx`: verifies leadership access and queue rendering.

For UX-TASK-006A, the Daily Review route and shared task surface were updated in the same files to support compact composition, queue search, and review progress.

## Testing

Verified with:

- `cd frontend && npm run build`
- `cd frontend && npm test -- navigation.test.tsx`
- `cd frontend && npm test -- projects-page-navigation.test.tsx`
- `cd frontend && npm test -- project-workspace.test.tsx`

All focused tests passed. The production build includes `/daily-review` and the existing project Execution route.

## Regression Verification

The existing project workspace execution test suite passed without changes to its expected behavior. The new route uses the same execution update APIs and modal, and no backend files were modified.

## Future Enhancements

- Add a persisted last-selected project and filter per user.
- Surface sprint metadata once sprint data is available from the project API.
- Add an explicit “reviewed by” audit event if the product later requires review completion tracking distinct from execution updates.
- Add a multi-project queue only after the single-project standup flow is validated.
