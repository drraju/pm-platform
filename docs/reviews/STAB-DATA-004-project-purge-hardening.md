# STAB-DATA-004 Project Purge Hardening

## Architecture Review

Project deletion has one authoritative permanent workflow:

- Archive/soft lifecycle path: `ProjectsService.remove()` delegates to `archive()` and marks the project `archived`.
- Restore path: `ProjectsService.restore()` returns archived projects to `active`.
- Permanent purge path: `ProjectsService.purge()` is platform-admin only and executes hard deletes inside one transaction.
- Item-level deletes for tasks, RAID, planning, documents, resource assignments, and members remain soft-delete or domain-local operations. They are not project purge implementations.

No bulk project delete or separate admin hard-delete workflow was found. If future bulk purge is introduced, it should call `ProjectsService.purge()` per project or share its purge orchestration and verification logic.

## Ownership Tree

Project owns:

- Project members
- Tasks
- Milestones, stored as `tasks.task_kind = 'milestone'`
- Task execution updates
- Task dependencies through predecessor/successor tasks
- Planning schedule snapshots
- Planning task schedules
- Portfolio dependencies when the purged project is predecessor or successor
- Resource allocations
- Resource capacities with `project_id`
- Resource workload snapshots with `project_id`
- Enterprise resource assignments
- RAID items: risks, issues, assumptions, dependencies
- RAID comments
- RAID history entries
- Project baselines
- Project baseline tasks
- Project document links

Enterprise calendars are not project-owned in the current schema. `schedule_snapshots` exists as a dormant entity class, but no migration or TypeORM registration currently creates/loads that table.

## FK Review

Expected FK posture from schema/migrations:

- `tasks.project_id -> projects.id ON DELETE CASCADE`
- `task_execution_updates.task_id -> tasks.id ON DELETE CASCADE`
- `task_execution_updates.project_id -> projects.id ON DELETE CASCADE`
- `task_dependencies.*_task_id -> tasks.id ON DELETE CASCADE`
- Planning snapshots/schedules reference projects and tasks with cascade in migrations.
- RAID tables, project members, project baselines, project baseline tasks, and project documents reference projects with cascade in migrations.
- `enterprise_resource_assignments.project_id -> projects.id` is not cascade in migration `018`; purge deletes it explicitly.
- Some TypeORM relation decorators omit `onDelete` even where migrations define cascade. Runtime uses `synchronize: false`, so the database schema is authoritative.

Use [stab-data-004-orphan-detection.sql](/Users/ramdatla/Projects/pm-platform/backend/src/database/scripts/stab-data-004-orphan-detection.sql) to verify the actual target DB constraints before release.

## Implementation Summary

- Purge now explicitly deletes `task_execution_updates` before task deletion.
- Purge now runs integrity verification inside the same transaction after deleting the project.
- If any project-owned row remains, purge logs diagnostics and throws `ConflictException`, causing the transaction to roll back.
- `TasksService.findAll()` and `findMyTasks()` now use an inner join to `project`, preventing legacy orphan task rows from being returned to My Tasks.
- Orphan detection and review-only repair SQL scripts were added.

## Repair Guidance

Detection is read-only:

- `backend/src/database/scripts/stab-data-004-orphan-detection.sql`

Repair is intentionally review-first and ends with `ROLLBACK`:

- `backend/src/database/scripts/stab-data-004-orphan-repair-review.sql`

Operations should run detection, inspect affected rows, run repair in a controlled transaction, re-run detection, and only then replace `ROLLBACK` with `COMMIT` if the result is approved.

## Manual Verification Checklist

1. Create a project.
2. Add project members.
3. Add standard tasks and milestone tasks.
4. Record task execution updates.
5. Add task dependencies.
6. Add RAID items, comments, and history.
7. Add planning snapshots/schedules and resource planning rows.
8. Add project document links.
9. Archive the project.
10. Permanently purge the project as a platform admin.
11. Verify the project is removed.
12. Verify tasks, milestones, execution updates, dependencies, RAID, planning, resources, documents, baselines, and members are removed.
13. Navigate to My Tasks.
14. Select `Task Scope = All Visible Tasks`.
15. Confirm the page loads without `Project <id> not found`.
16. Run orphan detection SQL and confirm all orphan counts are zero.
17. Confirm backend logs do not contain purge integrity failures or My Tasks project-not-found exceptions.

## Architecture Impact

The change keeps project purge as the aggregate-level owner of hard deletion. Database cascade remains a safety net, while application purge now explicitly orchestrates deletion and verifies the outcome. Defensive task filtering protects user-facing reads from legacy data drift but does not replace FK repair or purge correctness.
