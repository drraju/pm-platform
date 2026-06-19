# Current State Assessment

## Architecture Assessment

The project is a NestJS + Next.js repository split into `backend`, `frontend`, PostgreSQL schema, and Docker Compose. The core domain is partially modeled: users/roles/permissions, projects/members, tasks, RAID entities, and notifications exist as TypeORM entities and SQL tables.

Backend structure is module-based, but not yet clean architecture in the strict sense. Controllers call services directly, services use TypeORM repositories directly, and there are no use-case/application-layer boundaries, domain services, repository interfaces, or infrastructure adapters. Examples include `backend/src/modules/projects/projects.service.ts`, `backend/src/modules/tasks/tasks.service.ts`, and `backend/src/modules/raid/raid.service.ts`.

The frontend has usable global pages for dashboard, projects, tasks/Kanban, RAID, users, and auth. However, project-specific pages are placeholders that redirect: `frontend/app/projects/[projectId]/kanban/page.tsx`, `frontend/app/projects/[projectId]/timeline/page.tsx`, and `frontend/app/projects/[projectId]/raid/page.tsx`.

Docker Compose includes Postgres, Redis, MinIO, backend, and frontend, so deployment scaffolding exists. Redis and MinIO are not currently integrated into app logic.

## Missing Functionality

- Executive and user dashboard API behavior is missing. `DashboardService` is empty.
- Notifications API behavior is missing. The notification service and controller are shells.
- Slack integration is only a module shell.
- Google Drive integration is only a module shell.
- Project-scoped authorization is absent. JWT auth protects many routes, but services return all projects/tasks/RAID globally, not scoped to requester or project membership.
- Project membership management exists as an entity/table but has no controller/service operations.
- Timeline/Gantt is not implemented. `v1.0.6` Phase 1, Phase 2, and Phase 3 now add task hierarchy, milestone semantics, sequencing, task dependency APIs, and baseline capture, but frontend timeline/Gantt views remain incomplete.
- Kanban is read/create only. There is no drag/drop, reorder, WIP limits, board columns per project, or task status mutation from UI.
- RAID update/delete is incomplete for the generic RAID register. `RaidController` only has `GET` and `POST`.
- Refresh-token flow is incomplete. Auth issues refresh tokens, but there is no refresh endpoint, persistence, revocation, session table, or rotation.
- Role/permission enforcement is not implemented beyond storing role IDs.

## Technical Debt

- Most tests are placeholders, including auth, projects, tasks, and dashboard service specs.
- Existing tests could not be run because local dependencies are unavailable: backend failed with `jest: command not found`; frontend failed with `vitest: command not found`.
- `typeorm` dependency is declared as `^1.0.0`, which is highly suspicious for modern Nest TypeORM usage.
- Integration entities are not decorated with `@Entity()` and are not registered with TypeORM, so they are not persistent despite existing as classes.
- SQL schema and TypeORM model are already drifting: Slack/Google Drive integration persistence is absent from SQL, while entity files exist.
- CRUD services use hard deletes via `repository.remove()` despite base entities using `DeleteDateColumn`.
- Frontend auth stores JWTs in `localStorage`, which is simple but weak for an enterprise app.
- RAID creation UI maps one `severity` field into `severity`, `probability`, and `impact`, which loses semantic accuracy.
- DTO validation is uneven. Core create DTOs use validators, but integration/notification/update RAID DTOs are plain classes with no validation.
- No pagination/filtering/search on list endpoints; all projects/tasks/users/RAID items are returned wholesale.

## Prioritized Backlog

1. Establish a runnable baseline: install/fix dependencies, correct TypeORM version, verify backend/frontend tests and builds.
2. Add real service tests for auth, users, projects, tasks, RAID, dashboards, notifications, and integrations.
3. Implement authorization model: current-user injection, role/permission guards, and project membership scoping.
4. Replace global list endpoints with scoped, paginated, filterable endpoints.
5. Implement project membership management: add/remove members, update project roles, enforce access.
6. Complete dashboard backend: executive metrics, user metrics, overdue/blocked/at-risk aggregations.
7. Complete task/Kanban workflows: update status, assign/reassign, project-specific board, drag/drop frontend.
8. Implement timeline/Gantt: milestone/task date model, dependencies, project timeline API, frontend timeline page.
9. Complete RAID lifecycle: update/delete generic RAID items, project-scoped RAID views, proper risk/issue/assumption/dependency fields.
10. Build notifications: create/list/mark-read, event triggers, user dashboard count integration.
11. Implement Slack integration: OAuth/connect, webhook handling, project/channel mapping, notifications/events.
12. Implement Google Drive integration: OAuth/connect, linked project files, file list/search, permission-safe storage.
13. Harden auth: refresh endpoint, token rotation/revocation, session persistence, safer frontend token handling.
14. Introduce clean architecture boundaries: application use cases, domain rules, repository ports, infrastructure adapters.
15. Add production migration workflow instead of relying only on initial SQL bootstrap.


**Current Fit**
The current platform is a solid execution MVP, but not yet a planning model. Tasks already carry `plannedStartDate`, `plannedEndDate`, `actualStartDate`, and `actualEndDate` in [task.entity.ts](/Users/ramdatla/Projects/pm-platform/backend/src/modules/tasks/entities/task.entity.ts:39), and projects already expose start/end dates in [project.entity.ts](/Users/ramdatla/Projects/pm-platform/backend/src/modules/projects/entities/project.entity.ts:27). What’s missing is the structure that turns dated tasks into a schedule: hierarchy, milestone semantics, dependency edges, effort, baseline snapshots, and reporting logic that distinguishes planning data from generic task list data. Today even portfolio “milestones” are inferred from ordinary future-dated tasks in [portfolio.service.ts](/Users/ramdatla/Projects/pm-platform/backend/src/modules/portfolio/portfolio.service.ts:243), and the timeline UI is still a redirect placeholder in [frontend/app/projects/[id]/timeline/page.tsx](/Users/ramdatla/Projects/pm-platform/frontend/app/projects/[id]/timeline/page.tsx:1).

**1. Domain Model**
Use `Task` as the core planning work item, but extend it into explicit planning concepts rather than introducing a separate “plan item” model in v1.0.6.

Core concepts:
- `Task`
  - atomic schedulable unit of work
  - may be leaf, summary, or milestone
- `TaskHierarchy`
  - parent-child relationship between tasks in the same project
- `Summary Task`
  - derived roll-up task whose dates/progress come from children
- `Milestone`
  - zero-duration planning checkpoint
  - best modeled as a task flag/type, not a separate entity in v1.0.6
- `TaskDependency`
  - directed edge between predecessor and successor tasks
  - supports `FS`, `SS`, `FF`, `SF`
- `TaskBaseline`
  - frozen schedule/effort snapshot for comparison against current plan
- `TaskAssignment`
  - keep current single assignee for v1.0.6, but design effort fields so multi-resource assignment can come later

Recommended task semantics:
- `taskKind`
  - `standard`
  - `summary`
  - `milestone`
- `parentTaskId`
  - nullable
- `isLeaf`
  - derived, not stored
- `isScheduled`
  - derived from planned dates
- `durationDays`
  - derived from planned dates, not stored initially

Business rules:
- summary tasks cannot have dependency edges as predecessors/successors in phase 1 unless explicitly allowed
- milestones must have zero duration
- child tasks must belong to the same project as parent
- dependency edges must stay within a project in v1.0.6
- planned dates are manager-controlled
- actual dates can be system-assisted from status transitions later, but remain editable in v1.0.6
- baseline rows are immutable after creation

**2. ERD**
Proposed ERD:

```text
projects
  id PK
  ...

tasks
  id PK
  project_id FK -> projects.id
  parent_task_id FK -> tasks.id nullable
  assignee_id FK -> users.id nullable
  title
  description
  status
  priority
  task_kind               -- standard | summary | milestone
  sequence_number         -- stable ordering in plan/tree
  wbs_code                -- optional generated code like 1.2.3
  percent_complete
  planned_start_date
  planned_end_date
  actual_start_date
  actual_end_date
  estimated_hours
  remaining_hours
  baseline_start_date     -- optional shortcut for current approved baseline
  baseline_end_date
  baseline_estimated_hours
  start_date              -- deprecate over time or reinterpret carefully
  due_date                -- deprecate over time or reinterpret carefully
  created_at
  updated_at
  deleted_at
  ...

task_dependencies
  id PK
  project_id FK -> projects.id
  predecessor_task_id FK -> tasks.id
  successor_task_id FK -> tasks.id
  dependency_type        -- FS | SS | FF | SF
  lag_days               -- integer, default 0
  created_at
  updated_at
  deleted_at
  ...
  unique(active predecessor, successor)

task_baselines
  id PK
  project_id FK -> projects.id
  task_id FK -> tasks.id
  baseline_name
  baseline_version
  baseline_start_date
  baseline_end_date
  baseline_estimated_hours
  captured_at
  captured_by_id FK -> users.id
  is_current             -- optional convenience pointer
```

Optional later entities, not required for v1.0.6:
- `task_resource_assignments`
- `project_calendars`
- `working_calendars`
- `portfolio_plan_snapshots`

**3. Database Schema Changes**
Extend `tasks` rather than replacing it.

Add to `tasks`:
- `parent_task_id UUID NULL REFERENCES tasks(id)`
- `task_kind VARCHAR(20) NOT NULL DEFAULT 'standard'`
- `sequence_number INTEGER NULL`
- `wbs_code VARCHAR(50) NULL`
- `estimated_hours NUMERIC(10,2) NULL`
- `remaining_hours NUMERIC(10,2) NULL`
- `baseline_start_date DATE NULL`
- `baseline_end_date DATE NULL`
- `baseline_estimated_hours NUMERIC(10,2) NULL`

Add constraints:
- `task_kind IN ('standard','summary','milestone')`
- `estimated_hours >= 0`
- `remaining_hours >= 0`
- milestone date rule: planned start = planned end when both exist
- child task must share project with parent, enforced in service/application layer first
- prevent self-parenting
- prevent self-dependency

Add `task_dependencies`:
- `project_id`
- `predecessor_task_id`
- `successor_task_id`
- `dependency_type`
- `lag_days`
- audit columns
- partial unique index on active `(predecessor_task_id, successor_task_id)`

Add `task_baselines`:
- append-only baseline snapshots
- index by `(project_id, task_id, captured_at desc)`

Indexing:
- `tasks(project_id, parent_task_id, sequence_number)`
- `tasks(project_id, task_kind, planned_start_date, planned_end_date)`
- `task_dependencies(project_id, predecessor_task_id)`
- `task_dependencies(project_id, successor_task_id)`
- `task_baselines(project_id, task_id, is_current)`

Compatibility note:
- keep `start_date` and `due_date` during v1.0.6
- define canonical interpretation:
  - `planned_start_date` / `planned_end_date` become planning source of truth
  - `start_date` / `due_date` remain legacy compatibility fields until downstream APIs/UI are migrated

**4. API Design**
Introduce planning-focused APIs alongside existing task CRUD.

Project planning endpoints:
- `GET /projects/:id/plan`
  - returns hierarchical tasks, dependencies, current baseline metadata, filters
- `GET /projects/:id/timeline`
  - flattened schedule projection optimized for timeline rendering
- `GET /projects/:id/gantt`
  - hierarchical schedule projection with dependency edges and baseline overlay
- `GET /projects/:id/critical-path`
  - returns critical tasks/edges and calculated float metadata
- `POST /projects/:id/baselines`
  - captures current schedule baseline
- `GET /projects/:id/baselines`
  - lists baseline snapshots

Task endpoints:
- extend `POST /projects/:id/tasks`
- extend `PATCH /projects/:id/tasks/:taskId`

New task fields in DTOs:
- `parentTaskId`
- `taskKind`
- `plannedStartDate`
- `plannedEndDate`
- `actualStartDate`
- `actualEndDate`
- `estimatedHours`
- `remainingHours`
- `sequenceNumber`

Dependency endpoints:
- `POST /projects/:id/task-dependencies`
- `PATCH /projects/:id/task-dependencies/:dependencyId`
- `DELETE /projects/:id/task-dependencies/:dependencyId`

Example `GET /projects/:id/gantt` shape:
```json
{
  "project": { "id": "p1", "name": "ERP Modernization" },
  "tasks": [
    {
      "id": "t1",
      "parentTaskId": null,
      "taskKind": "summary",
      "title": "Design Phase",
      "plannedStartDate": "2026-07-01",
      "plannedEndDate": "2026-07-21",
      "actualStartDate": "2026-07-03",
      "actualEndDate": null,
      "baselineStartDate": "2026-07-01",
      "baselineEndDate": "2026-07-18",
      "estimatedHours": 120,
      "remainingHours": 72,
      "percentComplete": 40,
      "sequenceNumber": 10,
      "depth": 0,
      "isCritical": true,
      "slackDays": 0
    }
  ],
  "dependencies": [
    {
      "id": "d1",
      "predecessorTaskId": "t1",
      "successorTaskId": "t2",
      "dependencyType": "FS",
      "lagDays": 0,
      "isCritical": true
    }
  ],
  "baseline": {
    "id": "b3",
    "name": "Approved Plan",
    "capturedAt": "2026-07-01T09:00:00Z"
  }
}
```

Authorization:
- reuse project visibility for reads
- require project-manage capability for schedule structure changes
- optionally allow assignees to update `actual*`, `remainingHours`, `percentComplete` only

**5. UI Design**
Design `v1.0.6` as a planning foundation, not full MS Project parity.

Project workspace additions:
- keep current project workspace as the hub in [frontend/app/(app)/projects/[id]/page.tsx](/Users/ramdatla/Projects/pm-platform/frontend/app/(app)/projects/[id]/page.tsx:48)
- add a new `Plan` tab inside project workspace
- later split into:
  - `Plan`
  - `Timeline`
  - `Gantt`

Phase 1 UI:
- `Plan Grid`
  - tree table with expand/collapse
  - columns:
    - WBS
    - Title
    - Kind
    - Assignee
    - Planned Start
    - Planned End
    - Actual Start
    - Actual End
    - Estimated Hours
    - Remaining Hours
    - % Complete
  - inline create child task
  - create summary task
  - create milestone
- `Dependency Drawer/Modal`
  - predecessor
  - successor
  - type
  - lag
- `Baseline Banner`
  - current baseline name/date
  - “Capture Baseline” action
- `Timeline View`
  - read-only first
  - horizontal time scale
  - milestone markers
  - filter by assignee/status/date range
- `Gantt View`
  - split pane:
    - left tree grid
    - right time canvas
  - bars for standard/summary tasks
  - diamond markers for milestones
  - baseline ghost bars
  - dependency lines
  - critical path highlight
- `Resource Slice`
  - simple grouped-by-assignee workload strip
  - estimated vs remaining hours by week
  - no advanced leveling in phase 1

UX principles:
- summary tasks are visually distinct and non-leaf
- milestones are date points, not bars
- dependency editing is structured, not freeform
- baseline comparison is always optional but visible
- no drag-and-drop scheduling in v1.0.6 phase 1

**6. Migration Strategy**
Use additive, low-risk migration.

Phase A: additive schema
- add nullable planning columns to `tasks`
- add `task_dependencies`
- add `task_baselines`
- no destructive change to existing task APIs

Phase B: data backfill
- map existing `start_date` -> `planned_start_date` where planned date is null
- map existing `due_date` -> `planned_end_date` where planned end is null
- default `task_kind = standard`
- set `remaining_hours = estimated_hours` only when estimate is explicitly introduced later, not by blind backfill

Phase C: read-model transition
- timeline/gantt APIs read from `planned_*`
- dashboards and portfolio continue using legacy fields until updated
- then switch reporting logic to planning-aware interpretations

Phase D: semantic cleanup
- redefine `due_date` as legacy compatibility field or retire it in later release
- update dashboard and portfolio milestone logic to use `task_kind = milestone`

Operational migration guidance:
- keep migrations additive and reversible
- backfill in SQL for stable date copying
- don’t compute hierarchy, WBS, or critical path in migration
- compute derived values in application/read model

**Impact Analysis**
- `Timeline View`
  - gains real planned schedule semantics
  - milestones become explicit instead of inferred
  - summary tasks improve readability
- `Gantt View`
  - becomes viable only after hierarchy + dependencies + baselines exist
  - dependency line rendering comes directly from `task_dependencies`
- `Critical Path`
  - not credible today
  - becomes possible once dependency graph and planned dates exist
  - should be API-derived, not stored initially
- `Resource Planning`
  - estimated/remaining hours create a minimal capacity signal
  - single-assignee model supports basic workload reporting only
  - true leveling still requires resource assignment/calendar entities later
- `Portfolio Reporting`
  - can distinguish:
    - planned milestones
    - slipped milestones
    - critical-path tasks
    - hours remaining by project
  - current portfolio logic must stop treating generic due-dated tasks as milestones

**Phased Implementation Plan**
1. `v1.0.6a` Data Foundation
- add task planning columns
- add parent-child hierarchy
- add milestone semantics
- add dependency table
- extend task CRUD DTOs and validation

2. `v1.0.6b` Planning APIs
- build `/plan`, `/timeline`, `/gantt`
- add dependency CRUD
- add baseline capture/list APIs
- add hierarchy validation and schedule validation

3. `v1.0.6c` Plan Grid UI
- project workspace `Plan` tab
- hierarchical grid editing
- milestone/summary creation
- dependency management modal

4. `v1.0.6d` Timeline/Gantt UI
- read-only timeline
- read-only gantt with dependency lines
- baseline overlay
- critical path highlighting

5. `v1.0.6e` Reporting Integration
- update dashboard milestone logic
- add portfolio schedule signals
- add workload summary by assignee/project

**Risks**
- `High` Semantic confusion between legacy `startDate`/`dueDate` and new planned dates.
- `High` Recursive hierarchy bugs if parent-child integrity is not tightly validated.
- `High` Performance risk for Gantt rendering if APIs return raw task graphs without view-specific shaping.
- `Medium` Critical path calculations can become misleading if summary tasks and milestones are treated incorrectly.
- `Medium` Resource planning may be over-promised because single-assignee plus effort fields is not full capacity planning.
- `Medium` Authorization complexity increases when some users can edit actuals but not planned dates.

**Recommendations**
- Treat `v1.0.6` as a planning foundation release, not a full scheduling release.
- Use `Task` extension plus `task_dependencies` and `task_baselines`; do not introduce too many new top-level entities yet.
- Make `plannedStartDate` and `plannedEndDate` the planning source of truth from day one of the new APIs.
- Model milestones as a task kind in v1.0.6; only split into a separate entity later if the business truly needs different lifecycle behavior.
- Keep critical path and baseline views read-only first.
- Update portfolio/dashboard milestone logic as part of the rollout, because otherwise planning data and reporting semantics will diverge immediately.

If you want, I can turn this into a repo-ready design doc under `docs/releases/` or `docs/architecture/` next, without implementing code.
