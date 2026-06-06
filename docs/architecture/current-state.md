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
- Timeline/Gantt is not implemented. Tasks have `startDate` and `dueDate`, but no dependencies, milestones, sequencing, baseline dates, or frontend timeline.
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
