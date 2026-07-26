# Project Lifecycle Management

## Purpose

Projects are governed records. Normal removal archives a project so delivery
history remains available for reporting and audit. Permanent purge is reserved
for platform administrators and removes all project-owned data in one
transaction.

## Project Dependency Map

Verified project-owned records:

- `project_members.project_id`
- `tasks.project_id`
- `task_dependencies` through predecessor and successor tasks
- `project_baselines.project_id`
- `project_baseline_tasks.project_id`
- RAID item tables: `risks`, `issues`, `assumptions`, `dependencies`
- RAID audit/support tables: `raid_comments`, `raid_history_entries`
- Planning tables: `planning_schedule_snapshots`, `planning_task_schedules`
- Planning resource tables: `resource_allocations`, `resource_capacities`,
  `resource_workload_snapshots`
- Portfolio dependency table: `portfolio_dependencies.predecessor_project_id`
  and `portfolio_dependencies.successor_project_id`
- Enterprise resource assignments: `enterprise_resource_assignments.project_id`
- External document links: `project_documents.project_id`

Milestones are represented as project tasks with `task_kind = 'milestone'`;
they are purged with task records and task-derived planning records.

Enterprise calendars are not project-owned in the current model. Resources,
resource skills, capacity policies, availability overrides, document categories,
document types, users, roles, permissions, and Slack integration connection
metadata are platform-owned or reference data and are not purged with a project.

## Lifecycle Behavior

Archive sets `projects.status = 'archived'`. It does not soft-delete the
project or mutate dependent records. Default project lists exclude archived
projects; archive filters can request archived projects explicitly.

Restore changes archived projects back to `active` and leaves all relationships
intact.

Permanent purge deletes project-owned records in dependency order inside a
transaction. Baseline immutability triggers remain active for normal operation;
purge sets a transaction-local `pm_platform.project_purge` flag so immutable
baseline records can be removed only as part of the governed purge path.

## Cascade Strategy

Archive and restore use status changes because historical reporting requires
the project graph to remain intact.

Permanent purge uses service-layer cleanup rather than blindly enabling cascade
delete. Some tables already have database cascade behavior, while others use
`SET NULL`, no cascade, soft-delete columns, or immutability triggers. The
service-layer sequence makes the purge behavior explicit, covers soft-deleted
rows, and prevents orphaned records across mixed legacy and enterprise tables.
