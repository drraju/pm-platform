# ADR-016: Enterprise IAM and Permission-Based RBAC

## Status

Proposed.

## Date

2026-07-23

## Authors

PM Platform Architecture

## Context

PM Platform has JWT authentication, persisted roles, persisted permissions,
role-permission grants, permission guards, user management APIs, and frontend
permission-aware navigation. The current IAM surface is not enterprise-ready:

- public self-registration is exposed through `/auth/register` and the login UI
- password management workflows are incomplete
- current role names mix platform security roles, job titles, and project
  delivery responsibilities
- some authorization behavior still produces role-centric UX and does not
  consistently express own-object permissions

STAB-IAM-001 requires stabilization without introducing unrelated functional
modules.

## Decision

PM Platform will use permission-based RBAC with a small canonical platform role
taxonomy. Platform roles, job titles, and project responsibilities are separate
concepts.

Platform security roles are:

- `PLATFORM_ADMIN`
- `PORTFOLIO_MANAGER`
- `PROJECT_MANAGER`
- `TEAM_MEMBER`
- `EXECUTIVE`
- `CUSTOMER`
- `PARTNER`

Job titles are user-profile metadata. Examples include Engineer, QA Engineer,
Technical Lead, Architect, Scrum Master, Business Analyst, and Product Owner.
Job titles must not determine permissions.

Project responsibilities are project-scoped assignments. Examples include
Project Manager, Delivery Lead, Technical Lead, Test Lead, Sponsor, Business
Owner, Scrum Master, and Product Owner. Project responsibilities may affect
project-scoped policy checks only when combined with explicit permissions.
They do not replace platform roles.

Public self-registration is not permitted. Users are created by administrators
through guarded user-management APIs.

Password and account lifecycle operations belong to the IAM boundary:

- user change password
- forgot password and reset password
- admin reset password
- force password change
- disable and enable user
- lock and unlock account
- role assignment
- user profile and avatar update

Authorization policies must evaluate permission keys first and then scope those
permissions through ownership, membership, or project responsibility checks.
Own-object semantics must be explicit in permission names and policy methods,
for example `task.edit.own` or the repository's accepted equivalent naming
standard.

User-facing authorization messages must not expose implementation role names as
the reason an action failed. UI and API messages should describe the capability
or ownership requirement.

## Rationale

A small role taxonomy is easier to govern and audit. Fine-grained permission
keys provide safer evolution than role-name conditionals because permissions
can be granted, revoked, tested, and reviewed independently from job titles or
project assignment labels.

Separating job titles from platform roles prevents organization charts from
becoming access-control logic. Separating project responsibilities from
platform roles allows a user to be a Team Member globally while acting as a
Technical Lead or Delivery Lead on one project.

Removing self-registration aligns with enterprise onboarding and prevents
unapproved account creation.

## Alternatives Considered

| Alternative                                         | Reason Rejected                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Keep current role names                             | Maintains inconsistent authorization vocabulary and conflates security, profile, and project concepts.                   |
| Use only role-name checks                           | Produces brittle authorization, poor UX, and difficult auditability.                                                     |
| Make project responsibilities become platform roles | Forces project-specific duties into global access control and causes over-permissioning.                                 |
| Allow self-registration with approval later         | Still creates unmanaged identity records and increases security review scope.                                            |
| Put password reset inside Users only                | Password reset affects authentication/session policy and belongs to the IAM boundary, even when it updates User records. |

## Consequences

- A migration must normalize legacy role names to canonical platform roles.
- Seed data, tests, docs, and frontend labels must stop treating job titles as
  security roles.
- User profile persistence must add job-title/profile fields without changing
  permission semantics.
- Project responsibility persistence must remain project-scoped.
- Existing broad permissions may require compatibility mapping while new
  own-object permissions are introduced.
- `/auth/register` must be removed or disabled as a public endpoint during
  implementation.
- The login page must expose Sign In, Forgot Password, and optionally Contact
  Administrator, not Create User/Create Account.

## Implementation Notes

Implementation must wait until the STAB-IAM-001 Architecture Design Document,
Technical Design Review, and Architecture Baseline Commit are complete.

Expected implementation shape:

- `AuthController` owns sign-in, forgot-password, reset-password,
  change-password, and current-session endpoints.
- `UsersController` owns administrator account lifecycle commands.
- `UsersService` owns user persistence updates.
- An IAM/account service may coordinate password token lifecycle, account locks,
  force-password-change flags, and session invalidation while reusing existing
  users and roles repositories.
- Permission checks must remain centralized in the existing authz framework.

## References

- [STAB-IAM-001 Requirements Review](../STAB_IAM_001_REQUIREMENTS_REVIEW.md)
- [STAB-IAM-001 Repository Investigation and Gap Analysis](../STAB_IAM_001_REPOSITORY_INVESTIGATION_AND_GAP_ANALYSIS.md)
- [STAB-IAM-001 ADR Review](../STAB_IAM_001_ADR_REVIEW.md)
- [Security Architecture](../07-SECURITY-ARCHITECTURE.md)
- [Development Workflow](../08-DEVELOPMENT-WORKFLOW.md)

## Authentication Architecture

Authentication remains inside the IAM boundary. Controllers expose HTTP
operations, `AuthService` coordinates authentication use cases, password
workflow services own password mutation rules, and `UsersService` persists user
state.

Current dependency flow:

```text
AuthController
  -> AuthService
      -> PasswordUpdateService
          -> PasswordService
          -> PasswordPolicyService
          -> UsersService
              -> User repository
```

`UsersController` may create administrator-managed users, but it must hash
initial passwords through `PasswordService` before calling `UsersService`.
`UsersService` must never hash, compare, validate, or orchestrate password
workflows.

## Authentication Flow

Login verifies submitted credentials through `PasswordService`, then
`AuthService` issues a JWT access token and a signed refresh token. Protected
requests pass through `JwtAuthGuard` and `JwtStrategy`. The JWT strategy
loads the minimal user state needed to confirm that the user still exists, is
active, and has not changed password since the token was issued.

Refresh token handling is currently token issuance only. There is no persistent
session store, refresh endpoint, token rotation, reuse detection, or revocation
table yet.

## Password Architecture

`PasswordService` is the only bcrypt boundary. It owns password hashing and
password hash comparison only.

`PasswordPolicyService` is the only password policy authority. It evaluates
candidate passwords for required length and complexity and returns structured
validation results.

`PasswordUpdateService` owns password mutation workflows. The implemented
workflow is `changeOwnPassword`, which verifies the current password, validates
the new password through `PasswordPolicyService`, rejects reuse, hashes the
new password through `PasswordService`, persists the hash through
`UsersService`, updates `password_changed_at`, and records an audit integration
event without logging password material.

`UsersService` owns user persistence. Password-related persistence is limited
to selecting authentication users when explicitly needed, selecting token
validation state, and updating `password_hash` with `password_changed_at`.

## Password Change Workflow

The current change-password workflow is:

1. `AuthController` receives `POST /auth/change-password`.
2. `JwtAuthGuard` authenticates the caller.
3. `AuthService` delegates to `PasswordUpdateService.changeOwnPassword`.
4. `PasswordUpdateService` validates confirmation and password policy.
5. `PasswordUpdateService` verifies the current password with a generic
   authentication failure on mismatch.
6. `PasswordUpdateService` rejects reuse of the existing password.
7. `PasswordUpdateService` hashes the accepted password.
8. `UsersService.updatePassword` persists the hash and sets
   `password_changed_at`.
9. The frontend clears local session state and requires sign-in again.

## `password_changed_at` Strategy

`password_changed_at` is nullable for legacy users and set whenever
`UsersService.updatePassword` persists a new password hash. It is the canonical
timestamp for invalidating tokens issued before a password change.

## JWT Invalidation Strategy

`JwtStrategy` compares the JWT `iat` claim with `users.password_changed_at`.
Tokens issued before the recorded password change are rejected as invalid
sessions. Tokens issued after the recorded password change remain valid if the
user is active and the token has not expired.

## Current Session Model

The current model is stateless JWT authentication. Access tokens expire
according to JWT configuration. Refresh tokens are signed and returned to the
client, and the frontend stores both access and refresh tokens in local
storage. The frontend clears local tokens after successful password change.

This is not yet an enterprise session-management implementation because there
is no server-side refresh-token persistence, rotation, logout revocation,
session inventory, or device/session audit trail.

## Future Session Roadmap

Future authentication stabilization tasks should reuse the current password
foundation and add:

- forgot password and password reset tokens
- administrator password reset
- forced password change and password expiry policy
- persistent refresh sessions with rotation and revocation
- logout and all-sessions logout
- MFA enrollment, challenge, recovery, and session elevation
- durable security audit events
