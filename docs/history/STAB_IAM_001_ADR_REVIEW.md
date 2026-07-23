# STAB-IAM-001 ADR Review

## Status

Draft for architecture review.

## Date

2026-07-23

## Reviewed ADRs and Architecture Documents

| Document | Relevance | Coverage | Gap |
| --- | --- | --- | --- |
| `ADR-001-feature-architecture.md` | Feature and module boundaries | Supports clean feature architecture | Does not decide IAM role taxonomy. |
| `ADR-004-api-design.md` | REST, DTO, validation, transport rules | Applies to password and account APIs | Does not define account command API shape. |
| `ADR-005-frontend-architecture.md` | Frontend route and feature layering | Applies to auth and user-management UI | Does not decide login/register UX. |
| `ADR-012-erm-permissions-visibility.md` | Permission-specific governance | Reinforces domain permissions over broad roles | ERM-specific, not platform IAM-wide. |
| `ADR-014-client-platform-layering.md` | Frontend platform boundaries | Supports permission-aware navigation and app shell patterns | Does not define IAM admin workspace behavior. |
| `07-SECURITY-ARCHITECTURE.md` | Auth, RBAC, visibility, sensitive data | Establishes current security baseline | Currently documents login/register as existing auth surface. |
| `role-visibility-matrix.md` | Current role visibility expectations | Records current behavior | Contains role names that must be normalized. |

## Decision Coverage

Existing ADRs cover the following:

- Reuse the existing JWT/auth module rather than introducing a second
  authentication framework.
- Reuse permission guards, decorators, and role-permission tables.
- Keep frontend permission filtering based on `/auth/me`.
- Preserve bounded context ownership and DTO-based public APIs.

Existing ADRs do not cover the following STAB-IAM-001 decisions:

- Whether public self-registration is permitted.
- Canonical enterprise platform role taxonomy.
- Separation of security role, user job title, and project responsibility.
- Password recovery and reset ownership.
- Force-password-change and account lock lifecycle.
- Own-object permission naming and policy semantics.
- Migration from legacy role names to canonical platform roles.

## ADR Requirement

A new ADR is required before implementation.

Required ADR:

- `ADR-016-enterprise-iam-rbac.md`

The ADR must decide the enterprise IAM role taxonomy, account lifecycle
boundary, password-management ownership, and permission-first authorization
model for STAB-IAM-001.

