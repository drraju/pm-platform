# STAB-IAM-001 Repository Investigation and Gap Analysis

## Status

Draft for architecture review.

## Date

2026-07-23

## Repository Baseline

- Project: PM Platform
- Branch: `develop-v1.2`
- Working tree at investigation start: clean
- Governance workflow: `docs/architecture/08-DEVELOPMENT-WORKFLOW.md`
- Security reference: `docs/architecture/07-SECURITY-ARCHITECTURE.md`

## Existing IAM Capabilities

| Capability | Current Location | Finding |
| --- | --- | --- |
| JWT login | `backend/src/modules/auth` | Implemented with `/auth/login`, `AuthService`, `JwtStrategy`, and `JwtAuthGuard`. |
| Public registration | `backend/src/modules/auth/auth.controller.ts`, `frontend/app/(auth)/login/page.tsx` | Implemented and exposed through `/auth/register` and a login-page create-account mode. This conflicts with enterprise IAM requirements. |
| Session profile | `backend/src/modules/auth/dto/auth-me.dto.ts`, `UsersService.getSessionProfile` | Returns user, roles, and permissions for frontend authorization. |
| Admin user creation | `backend/src/modules/users/users.controller.ts` | Exists through guarded `POST /users` requiring `user.manage`. |
| User updates | `backend/src/modules/users/users.controller.ts` | Exists through guarded `PATCH /users/:id`; does not yet distinguish profile update from admin account management. |
| Roles | `roles` table and `Role` entity | Persisted and permission-backed, but seeded/current role names include job titles and responsibilities. |
| Permissions | `permissions` table, `role_permissions`, `PermissionKey` | Permission-based RBAC foundation exists. |
| Authorization guards | `backend/src/common/authz` | `PermissionsGuard`, `RequirePermissions`, `RequireAnyPermissions`, and `AuthorizationPolicyService` exist. |
| Project visibility | `ProjectVisibilityService`, `AuthorizationPolicyService` | Visibility combines permissions, governance fields, membership, and task assignment expansion. |
| Password hashing | `AuthService`, `UsersService` | Uses bcrypt hashing. Password hashes are excluded from normal entity selects and response sanitization. |
| Password management workflows | Not found | Change password, forgot password, reset password, force password change, and unlock flows are missing. |
| Login UI | `frontend/app/(auth)/login/page.tsx` | Exposes sign-in and create-account modes; forgot password is absent. |

## Current Role Evidence

Role and permission seed data currently references these security-role-like,
job-title-like, and responsibility-like names:

- `SUPER_ADMIN`
- `Admin`
- `Program Manager`
- `Portfolio Manager`
- `Project Manager`
- `Delivery Lead`
- `Team Member`
- `Engineer`
- `QA Engineer`
- `Executive`
- `Customer`
- `Partner`
- `Technical Lead`

Primary evidence:

- `backend/src/database/migrations/003_v1_0_5_1_authorization_alignment.sql`
- `backend/src/database/migrations/002_v1_0_5_project_teams_task_operations.sql`
- `backend/src/common/authz/authorization-policy.service.spec.ts`
- `docs/architecture/role-visibility-matrix.md`

## Existing Permission Model

The platform already has permission keys such as:

- `project.read`
- `project.create`
- `project.update`
- `project.delete`
- `task.create`
- `task.update`
- `task.delete`
- `task.reassign`
- `task.comment`
- `raid.create`
- `raid.update`
- `user.manage`
- `role.manage`
- `permission.manage`

Gap: permission names are broad and do not yet encode own-object distinctions
such as `task.edit.own`, profile permissions, password permissions, or account
administration permissions.

## Existing Authorization Semantics

`AuthorizationPolicyService` already centralizes some permission and ownership
logic:

- global project access through project read plus portfolio or executive
  permissions
- project governor checks using owner, business owner, delivery lead, and
  executive sponsor fields
- project membership checks
- task-assignment visibility expansion
- manager-like project membership checks for mutation

Gap: policy method names and permission checks still combine broad role
semantics with broad permissions. They do not yet express explicit own-object
or responsibility-scoped permission keys.

## Gap Matrix

| Required Capability | Exists | Partial | Missing | Notes |
| --- | --- | --- | --- | --- |
| No self-registration |  |  | Yes | `/auth/register` and login create-account mode exist. |
| Admin-created users only | Yes |  |  | Guarded `POST /users` exists. |
| Canonical enterprise roles |  | Yes |  | RBAC tables exist, but role taxonomy is inconsistent. |
| Job title as user profile |  |  | Yes | No profile field for job title was found. |
| Project responsibilities | Yes | Yes |  | Project owner/business owner/delivery lead/sponsor fields and member roles exist, but responsibility names need normalization. |
| Permission-based RBAC | Yes | Yes |  | Foundation exists; own-object and account permissions are missing. |
| User change password |  |  | Yes | No endpoint/service flow found. |
| Forgot password |  |  | Yes | No token, request, or reset flow found. |
| Admin reset password |  |  | Yes | No admin reset endpoint found. |
| Force password change |  |  | Yes | No user state flag or login challenge found. |
| Disable/enable user |  | Yes |  | `status` exists and update is possible, but dedicated account lifecycle commands are absent. |
| Lock/unlock account |  |  | Yes | No lock state, login-attempt tracking, or unlock command found. |
| Friendly authorization UX |  | Yes |  | Permissions exist, but user-facing copy and own-object policy need alignment. |

## Architecture Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Role migration breaks access | Users may lose access or gain unintended access. | Use compatibility mapping, seed verification, and migration tests. |
| Removing `/auth/register` breaks tests or demos | Existing frontend tests and seed flows may assume self-registration. | Replace with admin-create and seeded-user flows. |
| Password reset tokens leak | Credential recovery can become a sensitive data exposure path. | Store hashed tokens only, enforce expiry, redact tokens from responses and logs. |
| Force-password-change conflicts with JWT sessions | Users may retain access after admin reset. | Include `passwordChangedAt` and session invalidation strategy in design. |
| Own-object permissions widen data mutation | Users might edit objects they should only view. | Require both permission and ownership or responsibility policy checks. |
| Role, job title, and responsibility remain conflated in UI | Enterprise admins will keep using roles as job titles. | Separate UI fields and labels; make security role assignment distinct from profile and project team responsibility. |

## Readiness Assessment

The repository is ready for ADR and ADD review for STAB-IAM-001 because the
authentication, RBAC, user-management, and project visibility foundations are
discoverable and already central enough to extend. It is not ready for
implementation until the role taxonomy, password flows, own-object permission
semantics, and migration strategy are approved.

