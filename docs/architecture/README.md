# PM Platform Architecture

This directory documents the current PM Platform architecture and approved roadmap guardrails. It is intended for new developers, architecture reviewers, future AI coding assistants, and enterprise stakeholders.

## Start Here

- [Build Playbook](../BUILD_PLAYBOOK.md)
- [00 Vision](00-VISION.md)
- [01 System Architecture](01-SYSTEM-ARCHITECTURE.md)
- [05 Scheduling Architecture](05-SCHEDULING-ARCHITECTURE.md)

## Canonical Architecture Set

| Document | Purpose |
| --- | --- |
| [00-VISION.md](00-VISION.md) | Product and architecture north star. |
| [01-SYSTEM-ARCHITECTURE.md](01-SYSTEM-ARCHITECTURE.md) | Runtime system, bounded contexts, diagrams. |
| [02-DOMAIN-MODEL.md](02-DOMAIN-MODEL.md) | Aggregates, relationships, roadmap domain boundaries. |
| [03-BACKEND-ARCHITECTURE.md](03-BACKEND-ARCHITECTURE.md) | NestJS module, controller, service, repository rules. |
| [04-FRONTEND-ARCHITECTURE.md](04-FRONTEND-ARCHITECTURE.md) | Next.js feature-based frontend structure. |
| [05-SCHEDULING-ARCHITECTURE.md](05-SCHEDULING-ARCHITECTURE.md) | Scheduling Engine isolation and responsibility boundaries. |
| [06-DATABASE-ARCHITECTURE.md](06-DATABASE-ARCHITECTURE.md) | Tables, migrations, indexes, audit, soft delete, tenancy notes. |
| [07-SECURITY-ARCHITECTURE.md](07-SECURITY-ARCHITECTURE.md) | Auth, RBAC, project visibility, future permission model. |
| [08-DEVELOPMENT-WORKFLOW.md](08-DEVELOPMENT-WORKFLOW.md) | Mandatory feature workflow. |
| [09-CODING-STANDARDS.md](09-CODING-STANDARDS.md) | Backend/frontend coding standards. |
| [10-ROADMAP.md](10-ROADMAP.md) | Completed, current, and future roadmap. |

## Architecture Decision Records

- [ADR-001 Feature Architecture](adr/ADR-001-feature-architecture.md)
- [ADR-002 Calendar Architecture](adr/ADR-002-calendar-architecture.md)
- [ADR-003 Scheduling Isolation](adr/ADR-003-scheduling-isolation.md)
- [ADR-004 API Design](adr/ADR-004-api-design.md)
- [ADR-005 Frontend Architecture](adr/ADR-005-frontend-architecture.md)

## Existing Detailed References

These existing documents remain useful detailed references:

| Document | Purpose |
| --- | --- |
| [System Architecture](system-architecture.md) | End-to-end repository, runtime, domain, deployment, and data-flow architecture. |
| [Backend Architecture](backend.md) | NestJS backend modules, request flow, persistence, transactions, and quality gates. |
| [Frontend Architecture](frontend.md) | Next.js frontend structure, component layers, UI principles, API client usage, and testing. |
| [Database ERD](database-erd.md) | Database entity relationship reference. |
| [Deployment Architecture](deployment.md) | Docker, environment, backup, upgrade, rollback, and operational deployment architecture. |
| [Security Architecture](security.md) | Authentication, authorization, RBAC, JWT, secrets, audit, and security principles. |
| [Scheduling Engine](scheduling-engine.md) | Internal scheduling pipeline and `ScheduleAnalysis` assembly. |
| [Planning Graph Engine](graph-engine.md) | Dependency graph model, validation, and topological ordering. |
| [Planning Forward Pass](forward-pass.md) | Early Start and Early Finish calculation. |
| [Planning Backward Pass](backward-pass.md) | Late Start and Late Finish calculation. |
| [Planning Float Engine](float-engine.md) | Total Float and Free Float calculation. |
| [Critical Path Engine](critical-path-engine.md) | Critical path scheduling architecture and future enhancement model. |
| [Project Workspace](project-workspace.md) | Project workspace layout and planning surface architecture. |
| [Portfolio Engine](portfolio-engine.md) | Portfolio dashboard and cross-project direction. |
| [Reporting Engine](reporting-engine.md) | Reporting architecture. |
| [AI Assistant Architecture](ai-assistant.md) | AI direction and governance principles. |
| [Role Visibility Matrix](role-visibility-matrix.md) | Role-based visibility expectations. |

## Non-Negotiable Boundaries

- Scheduling Engine owns CPM, float, and critical path.
- Calendars own working hours, holidays, and exception days.
- Resources own future capacity, availability, skills, and cost.
- Planning consumes scheduling.
- Calendar and resource administration must not directly mutate schedules.
- Database changes should be additive.
- Feature work should follow repository investigation, ADD, implementation, review, tests, Docker verification, and single-feature commit.

## Archived Architecture Documents

Historical snapshots, release-specific architecture notes, and superseded milestone documents are preserved under `docs/archive/architecture/`.

