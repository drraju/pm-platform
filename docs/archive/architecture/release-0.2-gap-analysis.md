# Release 0.2 Gap Analysis

## Scope

This report reviews the backend Auth, Users, Projects, and Tasks modules for Release 0.2 readiness.

Review dimensions:

- Implemented functionality
- Missing functionality
- API endpoints
- DTO coverage
- Entity coverage
- Test coverage

## Executive Summary

Projects is the most complete module for Release 0.2. It has authenticated CRUD endpoints, Swagger operation metadata, relation-rich detail loading, soft delete behavior, and meaningful service tests.

Auth, Users, and Tasks are functional but thin. They expose basic behavior, but lack production-grade access control, endpoint completeness, error handling depth, security hardening, and meaningful automated tests. Users and Tasks still rely on placeholder `it.todo` specs.

Cross-cutting gaps:

- No request-user context is passed into services.
- No project membership or role/permission enforcement beyond JWT route protection.
- No pagination, filtering, sorting parameters, or search on list endpoints.
- No controller tests or API/e2e coverage for these modules.
- Several delete paths still hard delete despite audit/soft-delete base entities.
- Swagger documentation is stronger for Projects than for Auth, Users, and Tasks.
- DTO coverage exists for create/update flows, but read/detail response DTOs are mostly missing.

## Auth Module

### Implemented Functionality

- User registration via `POST /auth/register`.
- User login via `POST /auth/login`.
- Password hashing during registration.
- Password verification during login.
- JWT access token issuance.
- Refresh token issuance as a signed JWT.
- Default role creation/lookup for registration when no role ID is supplied.
- JWT strategy that extracts bearer tokens and returns `{ userId, email, roleId }`.
- JWT auth guard for protected routes in other modules.

### Missing Functionality

- No refresh endpoint despite issuing refresh tokens.
- No logout endpoint.
- No refresh token persistence, rotation, revocation, reuse detection, or session table.
- No password reset or password change flow.
- No email verification or invite flow.
- No account lockout, brute-force protection, MFA, or rate limiting.
- No status checks during login; disabled/inactive users can authenticate if password matches.
- No role/permission guard integration beyond returning `roleId` in JWT payload.
- No current-user decorator or standardized authenticated principal type.
- No auth controller tests, service tests, or e2e tests for register/login failures.
- Uses default development JWT secret fallback, which is unsafe if not overridden.

### API Endpoints

| Method | Path | Implemented | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | Yes | Creates user and returns access/refresh tokens. |
| POST | `/auth/login` | Yes | Authenticates with email/password and returns tokens. |
| POST | `/auth/refresh` | No | Needed because refresh tokens are issued. |
| POST | `/auth/logout` | No | Needed for session termination/revocation. |
| GET | `/auth/me` | No | Needed for frontend session hydration and authorization context. |
| POST | `/auth/password/forgot` | No | Release 0.2 candidate if auth hardening is in scope. |
| POST | `/auth/password/reset` | No | Release 0.2 candidate if auth hardening is in scope. |

### DTO Coverage

Implemented DTOs:

- `LoginDto`: email, password validation.
- `RegisterDto`: email, first name, last name, password, optional role ID.
- `SessionDto`: access token and refresh token response shape.

Gaps:

- No `RefreshTokenDto`.
- No `CurrentUserDto` / `MeDto`.
- No logout/session DTO.
- No password reset/change DTOs.
- No role/permission claims response DTO.

### Entity Coverage

Auth has no dedicated session/auth entity.

Auth depends on:

- `User`
- `Role`

Gaps:

- No refresh token/session entity.
- No password reset token entity.
- No login audit/security event entity.
- No MFA/authenticator entity.

### Test Coverage

Current coverage:

- `auth.service.spec.ts` contains only `it.todo('defines authentication behavior')`.

Gaps:

- No tests for successful registration.
- No tests for duplicate registration conflict.
- No tests for default role creation.
- No tests for login success/failure.
- No tests for password hashing/comparison behavior.
- No tests for JWT payload contents.
- No tests for inactive user handling.
- No controller/e2e tests for auth endpoints.

## Users Module

### Implemented Functionality

- Authenticated user creation via `POST /users`.
- Authenticated user listing via `GET /users`.
- Authenticated user detail via `GET /users/:id`.
- Authenticated user update via `PATCH /users/:id`.
- Authenticated user deletion via `DELETE /users/:id`.
- Role listing via `GET /users/roles`.
- Role creation via `POST /users/roles`.
- Password hashing when `password` is provided.
- Supports pre-hashed password input through `passwordHash`.
- User lookup by email for auth.
- Loads role relation for list/detail endpoints.

### Missing Functionality

- No authorization rules for who can create/update/delete users.
- No permission enforcement despite `Permission` and `Role.permissions` entities.
- No user self-profile endpoint.
- No role update/delete endpoints.
- No permission CRUD endpoints.
- No role-permission assignment endpoints.
- No user invitation workflow.
- No user activation/deactivation semantics beyond mutable `status` string.
- No duplicate email handling at service/controller level.
- No password update flow with current password verification.
- No pagination/search/filtering for users.
- Delete uses hard remove, not soft delete.
- API responses likely expose `passwordHash` unless serialization is added elsewhere.

### API Endpoints

| Method | Path | Implemented | Notes |
| --- | --- | --- | --- |
| POST | `/users` | Yes | Creates a user. Requires JWT. |
| GET | `/users` | Yes | Lists all users with roles. Requires JWT. |
| GET | `/users/:id` | Yes | Gets one user with role. Requires JWT. |
| PATCH | `/users/:id` | Yes | Updates arbitrary user fields from update DTO. Requires JWT. |
| DELETE | `/users/:id` | Yes | Hard deletes user. Requires JWT. |
| GET | `/users/roles` | Yes | Lists roles ordered by name. Requires JWT. |
| POST | `/users/roles` | Yes | Creates role. Requires JWT. |
| PATCH | `/users/roles/:id` | No | Needed for role administration. |
| DELETE | `/users/roles/:id` | No | Needed for role administration. |
| GET | `/users/permissions` | No | Needed for RBAC management. |
| PATCH | `/users/:id/role` | No | Could make role assignment explicit. |

### DTO Coverage

Implemented DTOs:

- `CreateUserDto`: email, first name, last name, optional password hash, optional password, role ID, status.
- `UpdateUserDto`: partial create user DTO.
- `CreateRoleDto`: name and optional description.

Gaps:

- No public/safe `UserDto` that excludes `passwordHash`.
- No `UpdateRoleDto`.
- No `CreatePermissionDto` / `UpdatePermissionDto`.
- No role-permission assignment DTO.
- No user status transition DTO.
- No user list query DTO for pagination/filtering.
- `UpdateUserDto` inherits `passwordHash`, which allows direct password hash mutation through the public update endpoint.

### Entity Coverage

Implemented entities:

- `User`: email, first/last name, password hash, role ID, status, role relation, project memberships, notifications.
- `Role`: name, description, users relation, permissions many-to-many relation.
- `Permission`: key, description, roles many-to-many relation.

Gaps:

- `User` extends `TimestampedEntity`, not the auditable/soft-delete base used by many other entities.
- No explicit profile/preferences entity.
- No invitation entity.
- No session/security audit entity.
- Role/permission entities exist but are underused by service/controller logic.
- No serialization protection for sensitive fields is visible in the entity.

### Test Coverage

Current coverage:

- `users.service.spec.ts` contains only `it.todo('defines user management behavior')`.

Gaps:

- No tests for user creation with password hashing.
- No tests for missing password failure.
- No tests for create/list/detail/update/delete behavior.
- No tests for duplicate email behavior.
- No tests for role listing/creation.
- No tests proving password hashes are not exposed.
- No controller/e2e tests.

## Projects Module

### Implemented Functionality

- Authenticated project creation via `POST /projects`.
- Authenticated project listing via `GET /projects`.
- Authenticated project detail via `GET /projects/:id`.
- Authenticated project update via `PATCH /projects/:id`.
- Authenticated project delete via `DELETE /projects/:id`.
- List endpoint loads owner and orders newest first.
- Detail endpoint loads owner, members/users, tasks/assignees, and RAID context.
- Delete uses TypeORM soft remove.
- Swagger operation summaries, path parameters, and not-found/no-content responses are present.
- Project and project member entities are registered in the module.

### Missing Functionality

- No project membership management endpoints despite `ProjectMember` entity.
- No project-scoped authorization; any authenticated user can list/detail/update/delete all projects.
- No project status enum or lifecycle transition rules.
- No pagination/search/filtering on project list.
- No project archive/restore endpoint.
- No project health, budget, sponsor, stage, or portfolio metadata.
- No validation that `ownerId` refers to an existing user before persistence.
- No uniqueness constraints for project names within a workspace/portfolio.
- No controller/e2e tests for project API behavior.
- No dedicated response DTO for list versus detail shape.

### API Endpoints

| Method | Path | Implemented | Notes |
| --- | --- | --- | --- |
| POST | `/projects` | Yes | Creates project. Requires JWT. |
| GET | `/projects` | Yes | Lists projects with owner. Requires JWT. |
| GET | `/projects/:id` | Yes | Loads project detail with owner, members, tasks, and RAID relations. Requires JWT. |
| PATCH | `/projects/:id` | Yes | Updates project. Requires JWT. |
| DELETE | `/projects/:id` | Yes | Soft deletes project and returns 204. Requires JWT. |
| POST | `/projects/:id/members` | No | Needed for multi-project team management. |
| PATCH | `/projects/:id/members/:userId` | No | Needed for member role changes. |
| DELETE | `/projects/:id/members/:userId` | No | Needed for member removal. |
| GET | `/projects/:id/tasks` | No | Useful project-scoped task access. |
| GET | `/projects/:id/raid` | No | Useful project-scoped RAID access. |

### DTO Coverage

Implemented DTOs:

- `CreateProjectDto`: name, description, status, start date, target end date, owner ID.
- `UpdateProjectDto`: partial create project DTO.

Gaps:

- No `ProjectListQueryDto`.
- No `ProjectDetailDto` response DTO.
- No `ProjectSummaryDto` response DTO.
- No project member create/update DTO.
- No status transition DTO.
- `status` is a free-form string, not an enum-backed DTO field.

### Entity Coverage

Implemented entities:

- `Project`: name, description, status, dates, owner ID, owner relation, members, tasks, risks, issues, assumptions, dependencies.
- `ProjectMember`: project ID, user ID, project role enum, project relation, user relation, unique project/user constraint.

Strengths:

- Project entity captures core multi-project structure.
- Project member entity supports access/team modeling.
- Project has enough relations for detail dashboards.

Gaps:

- No budget, sponsor, portfolio/program, health, stage/gate, or business unit metadata.
- No workspace/tenant boundary.
- No project-specific settings entity.
- No explicit milestone entity.
- Project membership is modeled but not exposed through application services.

### Test Coverage

Current coverage:

- `projects.service.spec.ts` has meaningful tests for:
  - create
  - list ordering/relation loading
  - detail relation loading
  - not found behavior
  - update
  - soft delete

Gaps:

- No controller tests.
- No e2e tests for project endpoints.
- No authorization/access-scope tests.
- No validation tests for DTOs.
- No project membership tests.
- No transaction/integrity tests for cascading/soft delete behavior.

## Tasks Module

### Implemented Functionality

- Authenticated task creation via `POST /tasks`.
- Authenticated task listing via `GET /tasks`.
- Authenticated task detail via `GET /tasks/:id`.
- Authenticated task update via `PATCH /tasks/:id`.
- Authenticated task deletion via `DELETE /tasks/:id`.
- List/detail endpoints load project and assignee relations.
- Task status uses `TaskStatus` enum.
- Task supports priority, start date, due date, assignee, and project association.

### Missing Functionality

- No project-scoped task endpoints.
- No Kanban-specific update/reorder endpoint.
- No swimlanes, ordering, rank, WIP limits, or board configuration.
- No task dependency/subtask/milestone support.
- No due-date filtering, assignee filtering, project filtering, status filtering, or search.
- No authorization check that assignee/project is accessible to the current user.
- No validation that `projectId` or `assigneeId` exists before save.
- Delete uses hard remove, not soft delete.
- No audit trail for status changes.
- No comments, attachments, estimates, labels, or acceptance criteria.
- Swagger documentation is basic compared with Projects.

### API Endpoints

| Method | Path | Implemented | Notes |
| --- | --- | --- | --- |
| POST | `/tasks` | Yes | Creates task. Requires JWT. |
| GET | `/tasks` | Yes | Lists all tasks with project and assignee. Requires JWT. |
| GET | `/tasks/:id` | Yes | Gets one task with project and assignee. Requires JWT. |
| PATCH | `/tasks/:id` | Yes | Updates task. Requires JWT. |
| DELETE | `/tasks/:id` | Yes | Hard deletes task. Requires JWT. |
| GET | `/projects/:projectId/tasks` | No | Needed for project-scoped views. |
| PATCH | `/tasks/:id/status` | No | Useful explicit Kanban status transition endpoint. |
| PATCH | `/tasks/:id/assignee` | No | Useful explicit assignment endpoint. |
| PATCH | `/tasks/reorder` | No | Needed for Kanban ordering. |

### DTO Coverage

Implemented DTOs:

- `CreateTaskDto`: project ID, title, description, assignee ID, status enum, priority, start date, due date.
- `UpdateTaskDto`: partial create task DTO.

Gaps:

- No `TaskListQueryDto`.
- No task response/detail DTO.
- No status transition DTO.
- No reorder DTO.
- No assignment DTO.
- `priority` is a free-form string.
- No DTO-level due-date ordering or cross-field validation for `startDate <= dueDate`.

### Entity Coverage

Implemented entities:

- `Task`: project ID, title, description, assignee ID, status enum, priority, start date, due date, project relation, assignee relation.

Strengths:

- Covers core task/Kanban fields.
- Captures project and assignee relations.
- Uses shared auditable base with soft-delete column.

Gaps:

- No rank/order field for Kanban.
- No task type, estimate, progress, labels, comments, attachments, dependencies, or parent/subtask fields.
- No milestone relationship.
- No task history/status event entity.
- Entity has soft-delete column through base class, but service hard deletes.

### Test Coverage

Current coverage:

- `tasks.service.spec.ts` contains only `it.todo('defines task and kanban behavior')`.

Gaps:

- No tests for create/list/detail/update/delete.
- No tests for not-found behavior.
- No tests for relation loading.
- No tests for status enum handling.
- No tests for project/assignee validation.
- No controller/e2e tests.
- No Kanban workflow tests.

## Release 0.2 Recommendations

### P0: Required Before Release 0.2

1. Add real tests for Auth, Users, and Tasks services.
2. Add endpoint/e2e tests for Auth, Users, Projects, and Tasks.
3. Add `GET /auth/me` and a current-user decorator.
4. Add authorization guards for role/permission enforcement.
5. Add project membership access scoping for Projects and Tasks.
6. Prevent `passwordHash` exposure in user responses.
7. Remove public update access to `passwordHash`.
8. Change Tasks and Users delete flows to soft-delete or document hard-delete policy.
9. Add pagination/filter DTOs for Users, Projects, and Tasks list endpoints.

### P1: Strong Release 0.2 Candidates

1. Add project membership endpoints.
2. Add project-scoped task endpoints.
3. Add task status transition endpoint for Kanban.
4. Add refresh-token endpoint and persistence model.
5. Add role update/delete and permission assignment endpoints.
6. Add response DTOs for safe, stable API contracts.
7. Add stronger Swagger metadata to Auth, Users, and Tasks.

### P2: Later Release Items

1. Add password reset/change flows.
2. Add task comments, attachments, labels, and estimates.
3. Add task ordering/ranking and board configuration.
4. Add project portfolio metadata such as budget, sponsor, stage, business unit, and health scoring.
5. Add audit/history entities for user, project, and task changes.

## Release 0.2 Readiness Snapshot

| Module | Readiness | Rationale |
| --- | --- | --- |
| Auth | Low-Medium | Basic login/register works, but session lifecycle and security hardening are missing. Tests are placeholder-only. |
| Users | Low | CRUD and roles exist, but RBAC, safe response shaping, permissions, and tests are missing. |
| Projects | Medium-High | CRUD, rich detail loading, Swagger updates, and service tests exist. Access scoping and membership operations remain missing. |
| Tasks | Medium-Low | Basic CRUD exists, but Kanban/project-scoped workflows, filtering, soft delete, and tests are missing. |

