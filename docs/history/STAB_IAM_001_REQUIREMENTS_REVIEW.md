# STAB-IAM-001 Requirements Review

## Status

Draft for architecture review.

## Date

2026-07-23

## Objective

Stabilize Identity and Access Management for enterprise readiness by removing
self-registration, separating security roles from job titles and project
responsibilities, completing password management architecture, and moving
authorization decisions toward permission-based RBAC with ownership-aware
policies.

## In Scope

- Remove public self-registration from the login experience and backend auth
  surface.
- Keep administrator-created users as the only user creation path.
- Define the canonical platform security roles:
  - System Administrator
  - Portfolio Manager
  - Project Manager
  - Team Member
  - Executive
  - External User
- Move job titles into user profile metadata.
- Keep project responsibilities project-scoped and separate from platform
  roles.
- Define password management capabilities:
  - user change password
  - forgot password
  - admin reset password
  - force password change
  - account lock and unlock
  - disable and enable user
- Define permission-based RBAC and ownership-aware authorization semantics,
  including own-object permissions such as `task.edit.own`.
- Define authorization UX expectations so users do not see role-name-centric
  errors such as "Only managers can update."

## Out of Scope

- Introducing new delivery modules unrelated to IAM stabilization.
- Replacing JWT authentication.
- Introducing SaaS tenant isolation.
- Replacing Projects, Tasks, RAID, Portfolio, Dashboard, or Planning bounded
  contexts.
- Implementing source-code changes before architecture review and architecture
  baseline are complete.
- Implementing Slack, document, or workflow features beyond IAM permission
  effects.

## Protected Modules

- Scheduling Engine and Planning schedule calculation services.
- Calendar ownership of working hours, holidays, and exceptions.
- Project, Task, RAID, Portfolio, Dashboard, Resource, and Notification domain
  ownership boundaries.
- Existing DTO, controller, service, repository, guard, migration, and frontend
  feature layering.

## Backward Compatibility Constraints

- Existing active users must remain able to authenticate after role migration.
- Existing project visibility must not be widened during role normalization.
- Existing project membership and governance assignments must be preserved.
- Role-name migration must be data-migration driven and auditable.
- Existing permission keys should remain valid until every consumer has migrated
  to the canonical naming model.
- Admin-created users must continue to work through guarded `/users` APIs.

## Required Tests

- Backend auth tests for disabled, locked, force-password-change, login, forgot
  password, reset password, and change password behavior.
- Backend user-management tests for admin create, enable, disable, unlock, role
  assignment, and password reset.
- Backend migration or seed verification for canonical roles and role grants.
- Authorization policy tests for global permissions, project responsibilities,
  membership, and own-object permissions.
- Frontend login-page tests proving self-registration is absent and forgot
  password/contact administrator remains visible.
- Frontend user-management tests for admin account operations.
- Regression tests proving password hashes and reset tokens are never returned.

