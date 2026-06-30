# PM Platform Architecture

## Purpose

This directory defines the long-term architecture for the PM Platform. It is the reference point for product planning, implementation design, review, testing, deployment, and future enterprise extensions.

The platform is an enterprise project management system for organizations that need portfolio visibility, project execution, planning discipline, RAID governance, team accountability, reporting, and future AI-assisted project management.

## Architecture Principles

| Principle | Meaning |
| --- | --- |
| Enterprise first | Features must support repeatable project governance, auditability, permissions, and long-lived data. |
| One source of truth | Each business concept has one authoritative owner. Derived data must be calculated consistently. |
| Modular product domains | Planning, Portfolio, RAID, Tasks, Team, Reports, Security, and AI evolve independently through clear contracts. |
| Self-hostable by design | Docker and Ubuntu deployment remain first-class paths for UAT and customer environments. |
| Progressive enterprise depth | Basic workflows must stay usable while future capabilities such as critical path, baselines, resources, and AI can attach cleanly. |
| No hidden business rules in UI | UI should prevent invalid input, but backend services remain the authority for validation and state transitions. |

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL |
| Runtime | Node.js |
| Deployment | Docker Compose, Ubuntu UAT, future Kubernetes |
| Auth | JWT, RBAC, permission policies |
| Testing | Vitest, backend unit/integration tests, UAT guides |

## High-Level Architecture

```text
Users
  |
  v
Next.js Frontend
  |-- Dashboard
  |-- Portfolio
  |-- Project Workspace
  |-- Planning Workspace
  |-- Tasks
  |-- RAID
  |-- Reports
  |
  v
NestJS API
  |-- Auth and Authorization
  |-- Projects
  |-- Planning
  |-- Tasks
  |-- RAID
  |-- Portfolio
  |-- Users and Teams
  |-- Reporting
  |
  v
PostgreSQL
  |-- Projects
  |-- Project Members
  |-- Tasks and WBS
  |-- Planning Snapshots
  |-- Dependencies
  |-- RAID
  |-- Baselines
  |-- Audit Data
```

## Module Responsibilities

| Module | Responsibility | Architecture Notes |
| --- | --- | --- |
| Auth | Login, JWT, session identity | Does not own business authorization decisions alone. |
| Authorization | RBAC, permission checks, visibility | Enforced on backend; frontend uses permissions for experience shaping. |
| Projects | Project metadata, workspace context, team membership | Parent domain for project-scoped modules. |
| Planning | WBS, task scheduling, Gantt data, dependencies, baselines | Scheduling authority; see [Planning Engine v2](./planning-engine-v2.md). |
| Tasks | Execution updates, assignment, status, comments | Uses planning task model but focuses on delivery work. |
| RAID | Risks, assumptions, issues, dependencies | Project and future portfolio governance. |
| Portfolio | Cross-project visibility, health, milestones | Future program/customer/resource aggregation. |
| Reports | Operational, project, portfolio, executive, audit exports | Data consumer with governed transformations. |
| AI Assistant | Future project/program/portfolio intelligence | Must use audited tools and explainable recommendations. |

## Layered Architecture

```text
Presentation Layer
  Next.js routes, React components, UI state, accessibility

Application Layer
  Page orchestration, API clients, hooks, view models

Domain Service Layer
  NestJS services, scheduling rules, project visibility, authorization

Persistence Layer
  TypeORM entities, repositories, migrations, PostgreSQL constraints

Infrastructure Layer
  Docker, environment configuration, logging, backups, integrations
```

## Future Expansion

The architecture must support:

- Enterprise scheduling with critical path, calendars, constraints, lead/lag, and baselines.
- Resource capacity, workload, allocation, timesheets, and calendars.
- Portfolio/program/customer views with cross-project RAID and milestones.
- Report generation to PDF, Excel, PowerPoint, and scheduled delivery.
- AI Project Manager workflows using governed tool access and auditable recommendations.

## Development Principles

- Write features against documented domain concepts.
- Keep UI behavior consistent across Planning, Tasks, Overview, Reports, and Portfolio.
- Prefer reusable services/hooks/components over page-specific duplication.
- Add tests at the domain boundary where behavior is owned.
- Update architecture and ADRs when changing domain ownership or scheduling rules.
