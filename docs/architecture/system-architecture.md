# System Architecture

## Purpose

Describe the PM Platform system architecture across frontend, backend, database, integrations, deployment, and documentation boundaries.

## Scope

This document covers the current repository architecture and the target shape for enterprise project management capabilities, including planning, RAID, dashboards, integrations, and Docker deployment.

## Audience

Engineering leads, backend engineers, frontend engineers, QA engineers, DevOps owners, architects, and technical product managers.

## Overview

PM Platform is organized as a TypeScript monorepo with a NestJS backend, a Next.js frontend, PostgreSQL persistence, and Docker Compose deployment. The architecture emphasizes clean module boundaries, project-scoped authorization, and an incremental planning engine that can mature into resource management and portfolio planning.

## Contents

### Repository Structure

```text
pm-platform/
|-- backend/                 NestJS API and domain modules
|-- frontend/                Next.js application and UI components
|-- docs/                    Engineering, product, release, and user docs
|-- docker-compose.yml       Local deployment topology
`-- AGENTS.md                Repository-level implementation guidance
```

### Runtime Architecture

```text
User Browser
    |
    v
Next.js Frontend
    |
    | HTTPS/JSON API
    v
NestJS Backend API
    |
    | TypeORM
    v
PostgreSQL

External integrations
    |-- Slack
    `-- Google Drive
```

### Logical Domains

| Domain | Responsibility |
| --- | --- |
| Auth and Authorization | Login, JWT validation, permissions, and project visibility. |
| Projects | Project records, members, ownership, health, and project workspace data. |
| Tasks | Execution tasks, hierarchy, planned dates, status, assignees, and dependencies. |
| Planning | Snapshot schedules, Gantt workspace, critical path, and resource allocation foundations. |
| RAID | Risks, assumptions, issues, dependencies, comments, and audit history. |
| Dashboards | User, executive, and portfolio-level summaries. |
| Integrations | Slack and Google Drive integration surfaces. |

### Deployment Architecture

```text
Docker Compose
|-- frontend container
|-- backend container
`-- postgres container
```

### Data Flow

1. The user interacts with a Next.js page or component.
2. The frontend API client calls the NestJS backend.
3. Guards validate authentication and permissions.
4. Domain services validate business rules and call repositories.
5. TypeORM persists or reads PostgreSQL data.
6. The backend returns JSON DTOs to the frontend.

### Architecture Principles

- Keep domain behavior in backend services, not controllers.
- Keep frontend components reusable and feature-scoped.
- Treat PostgreSQL as the source of persisted truth.
- Use explicit validation for project-scoped access and planning integrity.
- Prefer migration-based schema evolution over runtime synchronization.

## Related Documents

- [Backend Architecture](backend.md)
- [Frontend Architecture](frontend.md)
- [Planning Engine Roadmap](planning-engine-roadmap.md)
- [Deployment Workflow](../development/deployment.md)
- [Product Roadmap](../roadmap/README.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created initial system architecture framework. |
