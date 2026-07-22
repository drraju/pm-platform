# Database Architecture

## Stack

- PostgreSQL 17 in Docker.
- TypeORM entity mappings.
- SQL baseline schema plus numbered migrations.

## Schema Sources

| Path | Purpose |
| --- | --- |
| `backend/src/database/schema/001_initial_schema.sql` | Baseline initialization for Postgres container. |
| `backend/src/database/migrations` | Additive migrations after baseline. |
| `backend/src/database/typeorm.config.ts` | TypeORM entity registration and connection config. |

## Migration Strategy

Migrations are additive and numbered. Current examples include project team operations, authorization hardening, task planning foundations, task dependencies, baselines, enterprise planning engine tables, milestone categories, summary dependency repair, and enterprise calendar domain tables.

Rules:

- Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` where practical.
- Prefer adding constraints over rewriting data.
- Avoid destructive schema changes.
- Keep migrations compatible with Docker and Ubuntu deployment.

## Current Table Groups

| Group | Tables |
| --- | --- |
| Auth/RBAC | `users`, `roles`, `permissions`, `role_permissions` |
| Projects | `projects`, `project_members` |
| Tasks/WBS | `tasks`, `task_dependencies` |
| Baselines | `project_baselines`, `project_baseline_tasks` |
| RAID | `risks`, `issues`, `assumptions`, `dependencies`, `raid_comments`, `raid_history_entries` |
| Planning | `planning_schedule_snapshots`, `planning_task_schedules`, `resource_capacities`, `resource_allocations`, `resource_workload_snapshots`, `portfolio_dependencies` |
| Calendars | `enterprise_calendars`, `enterprise_calendar_exceptions` |
| Documents | `project_documents`, `document_types`, `document_categories` |
| Notifications | `notifications` |

## Document Metadata Schema

Documents are metadata-only records. `project_documents` stores project scope, title, description, version, owner, audit user IDs, approval status, review dates, storage provider enum, link status, and external URL. `document_types` and `document_categories` are reference tables seeded by migration and designed for future administration.

External document URLs are application-validated as `http://` or `https://` only. PM Platform does not persist OAuth state, provider tokens, webhook cursors, synchronization checkpoints, provider-native file IDs, or binary content.

## Audit and Soft Delete

Most domain tables use:

- `created_at`
- `updated_at`
- `deleted_at`
- `created_by_id`
- `updated_by_id`
- `deleted_by_id`

Partial indexes frequently filter on `deleted_at IS NULL`.

## Important Index Patterns

| Area | Examples |
| --- | --- |
| Project governance | Owner/business owner/executive sponsor/delivery lead indexes. |
| Project membership | Project/user indexes and active unique membership. |
| Task hierarchy | Project, assignee, parent, project-parent-sequence indexes. |
| Dependencies | Predecessor, successor, active unique edge. |
| Baselines | Project, project/version, current baseline. |
| Planning | Project/version snapshots, schedule rows, resource capacity/allocation indexes. |
| Calendars | Active name uniqueness, calendar/date/type exception indexes. |

## Views and Read Models

No database views or materialized views are currently documented in the schema. Planning snapshots and task schedule rows act as persisted read models for the Planning Workspace.

## Future Multi-Tenancy

The current codebase does not have a general organization table or tenant column across all domain entities. Enterprise Calendar API work currently uses a default organization boundary at the service/API layer. SaaS multi-tenancy is a future roadmap item and will require an explicit tenant model, migration strategy, authorization policy, and data isolation design.
