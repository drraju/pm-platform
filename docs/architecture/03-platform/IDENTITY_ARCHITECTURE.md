# 4. User & Role Matrix

## Purpose

The PM Platform adopts a simplified Enterprise Role-Based Access Control (RBAC) model consisting of **seven platform roles**. These roles define **who a user is within the platform** and provide the foundation for authorization across all modules.

This matrix serves as the authoritative reference for role responsibilities and should remain stable. Functional permissions are defined separately in the Permission Matrix.

---

## Enterprise Roles

| Role | Primary Responsibility | Typical User | Scope |
|------|-------------------------|--------------|-------|
| **PLATFORM_ADMIN** | Administers the PM Platform, manages users, security, configuration, and platform governance. | IT Administrator / PMO Administrator | Entire Platform |
| **PORTFOLIO_MANAGER** | Oversees multiple projects, portfolios, governance, reporting, and strategic alignment. | PMO Manager / Portfolio Manager | Portfolio |
| **PROJECT_MANAGER** | Manages delivery of one or more projects including planning, execution, RAID, milestones, resources, and reporting. | Project Manager | Project |
| **TEAM_MEMBER** | Performs assigned project work and updates project information as permitted. | Engineer, Business Analyst, Tester, Developer, Technical Lead, QA Lead | Assigned Work |
| **EXECUTIVE** | Reviews portfolio performance, governance, KPIs, dashboards, and executive reports. | Director, Sponsor, CIO, Executive Leadership | Read Only |
| **CUSTOMER** | Reviews project progress and approved deliverables for projects to which they are assigned. | Client Representative | Assigned Projects |
| **PARTNER** | Collaborates on assigned projects on behalf of an external supplier or implementation partner. | Vendor / Consulting Partner | Assigned Projects |

---

## Design Principles

The role model follows these architectural principles:

- Only **seven platform roles** exist.
- Roles represent **business responsibilities**, not job titles.
- Job titles such as **Developer**, **Engineer**, **Technical Lead**, **QA Lead**, and **Business Analyst** are represented through project assignments rather than platform roles.
- Platform roles are intentionally stable and should rarely change.
- Functional permissions are managed through the Permission Matrix.
- Users may only hold one platform role at a time.
- Authorization is enforced centrally by the Identity & Access Management (IAM) subsystem.

---

# 5. Permission Matrix

## Purpose

The Permission Matrix defines **what each role is permitted to do** within the PM Platform.

This matrix is the authoritative specification for authorization across all modules.

Whenever a new feature or workspace is introduced, this matrix must be updated before implementation.

---

## Current Platform Permissions

| Capability | PLATFORM_ADMIN | PORTFOLIO_MANAGER | PROJECT_MANAGER | TEAM_MEMBER | EXECUTIVE | CUSTOMER | PARTNER |
|------------|:--------------:|:-----------------:|:---------------:|:-----------:|:---------:|:--------:|:-------:|
| Sign In | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Change Own Password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Users | ✓ | | | | | | |
| Edit Users | ✓ | | | | | | |
| Change User Role | ✓ | | | | | | |
| Enable / Disable User | ✓ | | | | | | |
| Reset User Password | ✓ | | | | | | |
| View User Administration | ✓ | | | | | | |
| Create Project | ✓ | ✓ | ✓ | | | | |
| Edit Project | ✓ | ✓ | ✓ | Limited | | | |
| Archive Project | ✓ | ✓ | ✓ | | | | |
| Restore Project | ✓ | ✓ | ✓ | | | | |
| Permanently Purge Project | ✓ | | | | | | |
| Manage Planning | ✓ | ✓ | ✓ | Assigned Work | View | View | Assigned Work |
| Manage Tasks | ✓ | ✓ | ✓ | Assigned Work | View | View | Assigned Work |
| Manage RAID | ✓ | ✓ | ✓ | Assigned Work | View | View | Assigned Work |
| Manage Milestones | ✓ | ✓ | ✓ | Assigned Work | View | View | Assigned Work |
| Manage Documents | ✓ | ✓ | ✓ | Assigned Work | View | View | Assigned Work |
| View Dashboards | ✓ | ✓ | ✓ | Project Only | ✓ | Assigned Projects | Assigned Projects |
| View Reports | ✓ | ✓ | ✓ | Project Only | ✓ | Assigned Projects | Assigned Projects |
| Administration Workspace | ✓ | | | | | | |

---

## Permission Definitions

| Permission | Description |
|------------|-------------|
| **✓** | Full access to perform the operation. |
| **Assigned Work** | User may update only work assigned to them. |
| **Assigned Projects** | User has access only to projects explicitly assigned to them. |
| **Project Only** | User may access only information for projects in which they are a member. |
| **Limited** | Restricted update capability defined by project ownership and assignment rules. |
| **View** | Read-only access. |

---

## Authorization Principles

The PM Platform follows the principle of **least privilege**.

Authorization rules include:

- PLATFORM_ADMIN is the only platform administrator.
- Users cannot modify their own role.
- Users cannot grant themselves additional permissions.
- Users cannot reset another user's password.
- Users cannot access projects to which they are not assigned.
- Disabled users cannot authenticate.
- Users are never permanently deleted.
- All administrative operations are audited.

---

## Future Expansion

As additional platform capabilities are introduced (e.g., Financial Management, Resource Management, Enterprise Risk Management, AI Governance, Portfolio Analytics), the Permission Matrix shall be extended.

New platform roles should **not** be introduced unless justified through an approved Architecture Decision Record (ADR).

The User & Role Matrix and Permission Matrix together form the authoritative RBAC specification for the PM Platform and shall be maintained as part of the platform architecture.