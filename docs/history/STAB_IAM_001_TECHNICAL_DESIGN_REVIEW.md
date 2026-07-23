# STAB-IAM-001 Technical Design Review

## Status

Conditionally approved for architecture baseline.

## Date

2026-07-23

## Reviewed Artifacts

- `STAB_IAM_001_REQUIREMENTS_REVIEW.md`
- `STAB_IAM_001_REPOSITORY_INVESTIGATION_AND_GAP_ANALYSIS.md`
- `STAB_IAM_001_ADR_REVIEW.md`
- `adr/ADR-016-enterprise-iam-rbac.md`
- `STAB_IAM_001_ARCHITECTURE_DESIGN.md`

## Review Outcome

The proposed STAB-IAM-001 architecture is directionally sound and consistent
with the existing platform architecture. It reuses the current JWT, Users,
RBAC, permission guard, policy service, TypeORM, migration, DTO, and frontend
feature-layering foundations rather than introducing a parallel IAM stack.

Implementation must remain blocked until the open approval conditions are
resolved and an architecture baseline commit is created.

## Architecture Compliance

| Area | Result | Notes |
| --- | --- | --- |
| Stage-gated workflow | Pass with condition | Stages 1 through 7 are documented; Stage 7.5 baseline commit remains pending. |
| Bounded contexts | Pass | Auth, Users, Projects, Tasks, RAID, Dashboard, Portfolio, Planning, and Calendar ownership are preserved. |
| Permission-based RBAC | Pass | The design keeps permissions central and treats roles as grant bundles. |
| Role/profile/responsibility separation | Pass | Platform role, job title, and project responsibility are separate concepts. |
| Password lifecycle | Pass | Password and account lifecycle capabilities are assigned to the IAM boundary. |
| Data protection | Pass | Password hashes and reset tokens remain non-returnable secrets. |
| Backward compatibility | Conditional | Role migration and `/auth/register` behavior require final approval. |
| Testability | Pass | Required backend, frontend, migration, and serialization tests are identified. |

## Required Decisions Before Implementation

- Approve or amend `ADR-016`.
- Choose the final own-object permission naming convention:
  - example request style: `task.edit.own`
  - current repository style: `task.update`
- Confirm how legacy `Delivery Lead` users migrate:
  - to `Project Manager`
  - to `Team Member` plus project responsibility
  - via permission-preserving migration based on existing grants
- Confirm removed `/auth/register` behavior:
  - remove route and return 404
  - keep route temporarily with 403
  - keep route temporarily with 410
- Confirm reset-token delivery strategy for local/dev environments before email
  delivery exists.

## Implementation Gate

Do not implement source-code changes until:

- this technical design review is accepted
- `ADR-016` status is updated from Proposed to Accepted or Superseded by an
  accepted alternative
- the architecture baseline commit is created with documentation only

