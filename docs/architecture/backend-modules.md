# Backend Modules

## Module Map

The backend is a NestJS API organized by domain modules under `backend/src/modules`. Modules expose REST controllers, domain services, DTOs, and TypeORM entities where applicable.

## Auth

Responsibilities:

- Register users.
- Authenticate email/password credentials.
- Issue access and refresh tokens.
- Validate JWT bearer tokens for protected APIs.

Controllers:

- `AuthController`

Services:

- `AuthService`
- `JwtStrategy`
- `JwtAuthGuard`

Main entities:

- `User`
- `Role`

Key APIs:

- `POST /auth/register`
- `POST /auth/login`

## Users

Responsibilities:

- Manage users.
- Manage roles.
- Return sanitized user response DTOs that exclude `passwordHash`.
- Support auth lookup by email with explicit password hash selection.

Controllers:

- `UsersController`

Services:

- `UsersService`

Main entities:

- `User`
- `Role`
- `Permission`
- `RolePermission`

Key APIs:

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`
- `GET /users/roles`
- `POST /users/roles`

## Projects

Responsibilities:

- Create, update, delete, list, and load project details.
- Manage project members.
- Manage project-scoped tasks.
- Expose project-scoped RAID collections.
- Attach calculated project health to project list and detail responses.

Controllers:

- `ProjectsController`

Services:

- `ProjectsService`
- `ProjectHealthService` through `HealthModule`

Main entities:

- `Project`
- `ProjectMember`
- `Task`
- `Risk`
- `Issue`
- `Assumption`
- `Dependency`
- `User`

Key APIs:

- `POST /projects`
- `GET /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `DELETE /projects/:id`
- `POST /projects/:id/members`
- `GET /projects/:id/members`
- `PATCH /projects/:id/members/:userId`
- `DELETE /projects/:id/members/:userId`
- `GET /projects/:projectId/tasks`
- `POST /projects/:projectId/tasks`
- `PATCH /projects/:projectId/tasks/:taskId`
- `DELETE /projects/:projectId/tasks/:taskId`
- `GET /projects/:id/risks`
- `GET /projects/:id/issues`
- `GET /projects/:id/assumptions`
- `GET /projects/:id/dependencies`

## Tasks

Responsibilities:

- Manage standalone task CRUD APIs.
- Provide authenticated "My Tasks" views.
- Provide authenticated task summary counts.
- Sort and filter user-assigned work.

Controllers:

- `TasksController`

Services:

- `TasksService`

Main entities:

- `Task`
- `Project`
- `User`

Key APIs:

- `POST /tasks`
- `GET /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`
- `GET /tasks/my`
- `GET /tasks/my/summary`

## Risks

Responsibilities:

- Manage risk CRUD APIs.
- Persist risk probability, impact, mitigation plan, status, owner, and project.

Controllers:

- `RisksController`

Services:

- `RisksService`

Main entities:

- `Risk`
- `Project`
- `User`

Key APIs:

- `POST /risks`
- `GET /risks`
- `GET /risks/:id`
- `PATCH /risks/:id`
- `DELETE /risks/:id`

## RAID

Responsibilities:

- Provide a unified RAID endpoint for mixed risks, assumptions, issues, and dependencies.
- Create typed RAID records from a shared DTO.
- Aggregate RAID collections for the frontend RAID register.

Controllers:

- `RaidController`

Services:

- `RaidService`

Main entities:

- `Risk`
- `Issue`
- `Assumption`
- `Dependency`
- `RaidItem` base class

Key APIs:

- `GET /raid`
- `POST /raid`

## Notifications

Responsibilities:

- Define notification persistence.
- Store user-targeted notification title, body, type, and read state.

Controllers:

- `NotificationsController`

Services:

- `NotificationsService`

Main entities:

- `Notification`
- `User`

Key APIs:

- No public controller methods are currently implemented in `NotificationsController`.

## Dashboard

Responsibilities:

- Build authenticated user dashboard data.
- Return assigned projects, task summary, overdue tasks, upcoming tasks, open risks, open issues, and aggregate health.
- Reuse project health calculation for assigned projects.

Controllers:

- `DashboardController`

Services:

- `DashboardService`
- `ProjectHealthService` through `HealthModule`

Main entities:

- `Project`
- `ProjectMember`
- `Task`
- `Risk`
- `Issue`

Key APIs:

- `GET /dashboard/me`

## Portfolio

Responsibilities:

- Build portfolio-wide project health summary.
- Return amber and red projects requiring attention.
- Count open risks by impact severity.
- Count open issues by severity/priority.
- Count incomplete overdue tasks by project.
- Keep portfolio aggregation logic inside `PortfolioService`.

Controllers:

- `PortfolioController`

Services:

- `PortfolioService`
- `ProjectHealthService` through `HealthModule`

Main entities:

- `Project`
- `Risk`
- `Issue`
- `Task`

Key APIs:

- `GET /portfolio/summary`

## Health

Responsibilities:

- Centralize project health calculation.
- Return `GREEN`, `AMBER`, or `RED` plus contributing reasons.

Controllers:

- None.

Services:

- `ProjectHealthService`

Main entities:

- Consumes `Task`, `Risk`, and `Issue` data supplied by caller services.

Key APIs:

- None directly. Used by Projects, Dashboard, and Portfolio.
