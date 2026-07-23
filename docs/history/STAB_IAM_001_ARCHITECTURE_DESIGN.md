# STAB-IAM-001 Architecture Design

## Status

Draft for technical design review.

## Date

2026-07-23

## Scope

STAB-IAM-001 stabilizes Identity and Access Management for enterprise readiness.
The design is intentionally limited to authentication, account lifecycle,
password lifecycle, role normalization, user profile separation, project
responsibility separation, and permission-based authorization policy.

## Goals

- Remove public self-registration.
- Preserve administrator-created users.
- Normalize platform roles into a small enterprise role taxonomy.
- Move job-title metadata into user profile.
- Keep project responsibilities project-scoped.
- Add complete password lifecycle architecture.
- Support own-object and responsibility-scoped permissions.
- Improve authorization UX by using capability-oriented messages.

## Non-Goals

- No unrelated product modules.
- No new scheduling, calendar, planning, portfolio, dashboard, RAID, Slack, or
  document-link capabilities.
- No tenant model.
- No source-code implementation before architecture approval and baseline.

## Architecture Principles

- Permission keys are the source of authorization capability.
- Roles are grant bundles, not business job titles.
- Job titles are descriptive profile metadata only.
- Project responsibilities scope project behavior and never grant global access
  by themselves.
- Password secrets, reset tokens, and hashes must never be returned to clients.
- Account lifecycle commands must be auditable and testable.
- Existing NestJS controller, DTO, service, repository, guard, and migration
  patterns remain authoritative.
- Existing Next.js route, feature folder, shared API client, and permission
  filtering patterns remain authoritative.

## Recommended Backend Architecture

### Auth Boundary

`backend/src/modules/auth` remains responsible for authentication and session
operations:

- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password`
- `GET /auth/me`

`POST /auth/register` must be removed or disabled as a public API. During
implementation, route removal is preferred unless API compatibility requires a
temporary `410 Gone` or `403 Forbidden` response.

Login must reject disabled or locked users. Login may return a
force-password-change challenge when the account requires password rotation
after admin reset.

### User Administration Boundary

`backend/src/modules/users` remains responsible for administrator-managed user,
role, and permission operations:

- create user
- update user profile and account metadata
- assign platform role
- disable user
- enable user
- unlock account
- admin reset password
- force password change

Dedicated command endpoints are preferred over overloading generic
`PATCH /users/:id` for account lifecycle behavior because they provide clearer
authorization, audit, validation, and tests.

### Account State

The user persistence model should add account-lifecycle fields through additive
migrations:

- `job_title`
- `avatar_url`
- `force_password_change`
- `password_changed_at`
- `disabled_at`
- `locked_at`
- `failed_login_attempts`
- `last_login_at`

Reset-token persistence should use a separate table with hashed token values:

- user id
- token hash
- purpose
- expiration time
- consumed time
- created time

Plain reset tokens must only be visible at creation time for delivery through a
future email/integration mechanism or development-safe response path explicitly
approved by security.

### Role Model

Canonical platform role names are persisted in `roles.name`:

- `System Administrator`
- `Portfolio Manager`
- `Project Manager`
- `Team Member`
- `Executive`
- `External User`

Legacy role migration should map:

| Legacy Role | Canonical Role |
| --- | --- |
| `SUPER_ADMIN` | `System Administrator` |
| `Admin` | `System Administrator` |
| `Program Manager` | `Portfolio Manager` |
| `Portfolio Manager` | `Portfolio Manager` |
| `Project Manager` | `Project Manager` |
| `Delivery Lead` | `Project Manager` or `Team Member` based on existing grants and project responsibility |
| `Team Member` | `Team Member` |
| `Engineer` | `Team Member` |
| `QA Engineer` | `Team Member` |
| `Technical Lead` | `Team Member` with project responsibility |
| `Executive` | `Executive` |
| `Customer` | `External User` |
| `Partner` | `External User` |

Migration must preserve effective access by copying existing permission grants
into canonical roles before retiring legacy role assignments.

### Permission Model

Existing permission keys remain valid during migration. New permissions should
be additive and explicit:

- `profile.view.own`
- `profile.edit.own`
- `avatar.edit.own`
- `password.change.own`
- `password.reset.request`
- `user.create`
- `user.disable`
- `user.enable`
- `user.unlock`
- `user.password.reset`
- `user.password.force_change`
- `role.assign`
- `task.edit.own`
- `raid.edit.own`
- `project.edit.own`

The final naming convention must be reconciled with existing repository style
before implementation. The important decision is explicit own-object capability,
not a specific verb spelling.

### Authorization Policy

Policy evaluation should follow this order:

```text
Authenticated actor
      |
Permission key granted
      |
Scope predicate
      |
Domain policy result
```

Scope predicates include:

- owns object
- assigned to task
- project member
- project responsibility
- project governor
- global platform permission

Project responsibilities may narrow or activate project-scoped permissions, but
must not grant permission without a permission key.

### API and Error UX

Controllers should expose capability-oriented errors:

- "You can update tasks assigned to you or tasks in projects you manage."
- "This account requires an administrator to reset access."
- "Your password must be changed before continuing."

Controllers should not expose role-name-centric errors such as "Only managers
can update."

## Recommended Frontend Architecture

### Login Page

The login page should expose:

- Sign In
- Forgot Password
- optional Contact Administrator

It must not expose Create User, Create Account, or registration mode.

### Account/Profile UI

User-facing profile settings should be separate from administrator user
management:

- change password
- update profile
- update avatar

Admin user management should expose account lifecycle commands only to users
with the relevant permissions:

- create user
- assign role
- enable or disable
- reset password
- force password change
- unlock account

### Permission-Aware Controls

Frontend controls should continue using `/auth/me` permissions to hide actions
that cannot succeed. Backend policy remains authoritative.

## Persistence Strategy

- Use additive SQL migrations under `backend/src/database/migrations`.
- Preserve UUID primary keys and existing timestamp/audit conventions.
- Do not return password hashes, reset token hashes, or secrets in DTOs.
- Add indexes for reset-token lookup and login account-state checks.
- Add migration verification for canonical roles and permissions.

## Test Strategy

Backend:

- Auth service and controller tests for login, disabled, locked,
  force-password-change, forgot/reset/change password.
- Users service/controller tests for admin lifecycle commands.
- Authorization policy tests for own-object and project responsibility scopes.
- Migration/seed verification for canonical roles and permission grants.
- Serialization tests for reset-token and password-field redaction.

Frontend:

- Login page tests proving register/create-account UI is absent.
- Forgot-password form tests.
- User-management permission-gated command tests.
- Profile/change-password tests.

## Implementation Sequence

1. Add canonical IAM permissions and role migration.
2. Add account lifecycle fields and reset-token persistence.
3. Remove or disable public registration backend route.
4. Update login UI and auth API client.
5. Add password lifecycle services and endpoints.
6. Add administrator account commands.
7. Add profile/avatar/password user-facing UI.
8. Normalize role labels, tests, docs, and seed verification.
9. Add own-object authorization policy coverage.

## Acceptance Criteria

- Login page no longer displays account creation.
- Public self-registration is unavailable.
- Administrators can create, enable, disable, unlock, reset passwords, force
  password change, and assign roles.
- Users can change password, update profile, and update avatar.
- Canonical platform roles are seeded and legacy role names no longer drive
  authorization.
- Job title is stored as profile metadata and does not determine permissions.
- Project responsibilities are project-scoped and do not replace platform roles.
- Own-object permissions are represented and tested.
- Authorization failures use capability-oriented messaging.
- Backend and frontend tests pass.
- Docker verification succeeds before implementation completion.

## Technical Design Review

Review outcome: conditionally ready for architecture approval.

Conditions before implementation:

- Approve ADR-016.
- Approve the canonical permission naming convention.
- Confirm the legacy `Delivery Lead` migration target.
- Confirm whether removed `/auth/register` should return 404, 403, or 410 for
  one release.
- Create the architecture baseline commit with documentation only.

