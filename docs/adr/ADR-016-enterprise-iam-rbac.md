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

| Alternative | Reason Rejected |
| --- | --- |
| Keep current role names | Maintains inconsistent authorization vocabulary and conflates security, profile, and project concepts. |
| Use only role-name checks | Produces brittle authorization, poor UX, and difficult auditability. |
| Make project responsibilities become platform roles | Forces project-specific duties into global access control and causes over-permissioning. |
| Allow self-registration with approval later | Still creates unmanaged identity records and increases security review scope. |
| Put password reset inside Users only | Password reset affects authentication/session policy and belongs to the IAM boundary, even when it updates User records. |

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
