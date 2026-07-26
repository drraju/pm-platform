# RBAC Architecture

Last updated: 2026-07-26

## Canonical Roles

PM Platform RBAC v1.0 supports exactly these global platform roles:

- `PLATFORM_ADMIN`
- `PORTFOLIO_MANAGER`
- `PROJECT_MANAGER`
- `TEAM_MEMBER`
- `EXECUTIVE`
- `CUSTOMER`
- `PARTNER`

Role definitions are centralized in `backend/src/common/enums/user-role.enum.ts`.
Application code must reference that enum rather than duplicating role-name
string literals. Frontend authorization decisions should prefer permission keys
returned by `/auth/me` rather than role-name checks.

## Legacy Role Migration

Legacy title-style roles are mapped into canonical roles:

| Legacy role | Canonical role |
| --- | --- |
| `SUPER_ADMIN` | `PLATFORM_ADMIN` |
| `Admin` / `ADMIN` | `PLATFORM_ADMIN` |
| `Program Manager` / `Portfolio Manager` | `PORTFOLIO_MANAGER` |
| `Project Manager` / `Delivery Lead` | `PROJECT_MANAGER` |
| `Technical Lead` / `Engineer` / `QA Engineer` / `Team Member` | `TEAM_MEMBER` |
| `Executive` | `EXECUTIVE` |
| `Customer` | `CUSTOMER` |
| `Partner` | `PARTNER` |

Migration `029_stab_rbac_001_role_consolidation.sql` creates canonical roles,
reassigns existing users, merges role-permission grants, and removes obsolete
role rows.

## Authorization Model

Authorization remains permission-based. Global roles grant permission keys, and
project-scoped policy checks further constrain access through ownership,
membership, task assignment, or project governance assignments.

Do not add role-name conditionals for access control. Add or change permission
grants through the canonical role matrix and policy services instead.
