# Architecture Documentation

This directory contains the current architecture references for PM Platform.
Historical snapshots, release-specific architecture notes, and superseded
milestone documents are preserved under `docs/archive/architecture/`.

## Current Architecture Documents

### Platform Architecture

| Document | Purpose |
| --- | --- |
| [System Architecture](system-architecture.md) | End-to-end repository, runtime, domain, deployment, and data-flow architecture. |
| [Backend Architecture](backend.md) | NestJS backend modules, request flow, persistence, transactions, and quality gates. |
| [Frontend Architecture](frontend.md) | Next.js frontend structure, component layers, UI principles, API client usage, and testing. |
| [Database ERD](database-erd.md) | Database entity relationship reference. |
| [Deployment Architecture](deployment.md) | Docker, environment, backup, upgrade, rollback, and operational deployment architecture. |
| [Security Architecture](security.md) | Authentication, authorization, RBAC, JWT, secrets, audit, and security principles. |

### Planning And Scheduling

| Document | Purpose |
| --- | --- |
| [Planning Engine v2](planning-engine-v2.md) | Planning engine domain model and scheduling architecture. |
| [Planning Engine Roadmap](planning-engine-roadmap.md) | Planning engine direction for validation, critical path, resources, and performance. |
| [Scheduling Engine](scheduling-engine.md) | Internal scheduling pipeline and `ScheduleAnalysis` assembly. |
| [Scheduling Engine Performance](scheduling-engine-performance.md) | Performance considerations for scheduling calculations. |
| [Planning Graph Engine](graph-engine.md) | Dependency graph model, validation, and topological ordering. |
| [Planning Forward Pass](forward-pass.md) | Early Start and Early Finish calculation. |
| [Planning Backward Pass](backward-pass.md) | Late Start and Late Finish calculation. |
| [Planning Float Engine](float-engine.md) | Total Float and Free Float calculation. |
| [Critical Path Engine](critical-path-engine.md) | Critical path scheduling architecture and future enhancement model. |
| [Project Workspace](project-workspace.md) | Project workspace layout, planning surface, task, RAID, team, document, and permission architecture. |

### Product Domains

| Document | Purpose |
| --- | --- |
| [Portfolio Engine](portfolio-engine.md) | Portfolio dashboard, portfolio Gantt, cross-project RAID, milestones, resources, and AI direction. |
| [Reporting Engine](reporting-engine.md) | Project, portfolio, executive, audit, export, scheduled report, and AI reporting architecture. |
| [AI Assistant Architecture](ai-assistant.md) | AI roles, capabilities, integrations, agentic workflows, and governance principles. |

### Access And Visibility

| Document | Purpose |
| --- | --- |
| [Role Visibility Matrix](role-visibility-matrix.md) | Role-based visibility expectations across project and dashboard surfaces. |

## Archived Architecture Documents

The following architecture documents were preserved as historical records during
the Phase 3 architecture refactor:

| Document | Reason Archived |
| --- | --- |
| [Current State Assessment](../archive/architecture/current-state.md) | Historical current-state planning assessment. |
| [Current State 2026-06-13](../archive/architecture/current-state-2026-06-13.md) | Dated architecture snapshot. |
| [Platform History](../archive/architecture/platform-history.md) | Historical platform timeline. |
| [Release 0.2 Gap Analysis](../archive/architecture/release-0.2-gap-analysis.md) | Release-specific readiness analysis. |
| [Runtime Role Validation Matrix](../archive/architecture/runtime-role-validation-matrix.md) | Version-specific runtime validation artifact. |
| [Planning Toolbar v1.0](../archive/architecture/planning-toolbar-v1.0.md) | Obsolete milestone-specific planning toolbar note. |
| [v1.0.6 Planning Foundation Architecture](../archive/architecture/v1.0.6-planning-foundation-architecture.md) | Obsolete milestone-specific architecture document. |
| [v1.0.7 Planning Engine Phase Rollup Enhancement](../archive/architecture/v1.0.7-planning-engine-phase-rollup-enhancement.md) | Obsolete milestone-specific architecture document. |
| [v1.1.0 Planning Workspace](../archive/architecture/v1.1.0-planning-workspace.md) | Obsolete milestone-specific architecture document. |
| [v1.1.1 Planning Engine](../archive/architecture/v1.1.1-planning-engine.md) | Obsolete milestone-specific architecture document. |

## Maintenance Rules

- Keep durable architecture references in `docs/architecture/`.
- Move release-specific, dated, or superseded architecture notes to
  `docs/archive/architecture/`.
- Update this index whenever architecture documents are added, moved, or
  archived.
