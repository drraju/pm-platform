# System Overview

## Platform Purpose

PM Platform is an enterprise project management platform for multi-project delivery oversight. It supports project workspaces, project membership, task tracking, RAID management, user dashboards, portfolio health reporting, notifications, and future integrations for Slack and Google Drive.

The current platform focuses on project execution data and portfolio-level visibility:

- Project delivery status and health.
- Team membership and task ownership.
- RAID records: risks, assumptions, issues, and dependencies.
- Portfolio summaries for project health, open risks, open issues, and overdue tasks.
- Authenticated user views for assigned projects and tasks.

## High-Level Architecture

The application is split into a Next.js frontend, a NestJS backend API, and PostgreSQL persistence. Docker Compose defines the local deployment topology and includes Redis and MinIO as supporting infrastructure services.

```text
                         +----------------------+
                         |      Browser UI      |
                         | Next.js App Router   |
                         +----------+-----------+
                                    |
                                    | HTTPS/HTTP JSON API
                                    v
                         +----------+-----------+
                         |      NestJS API      |
                         | Controllers/Services |
                         | JWT Auth + Swagger   |
                         +----+-----------+-----+
                              |           |
               TypeORM SQL    |           | Future cache/queue/session use
                              v           v
                    +---------+--+     +--+--------+
                    | PostgreSQL |     |   Redis   |
                    | Core data  |     | service   |
                    +------------+     +-----------+
                              |
                              | Future document/object storage
                              v
                         +----+-----+
                         |  MinIO   |
                         | objects  |
                         +----------+

       +---------------------------------------------------+
       | Docker Compose                                    |
       | postgres, redis, minio, backend, frontend services |
       +---------------------------------------------------+
```

## Frontend

The frontend is a Next.js App Router application under `frontend/app`. Authenticated workspace routes live under `frontend/app/(app)` and share the reusable application shell. The UI uses Tailwind classes and reusable components from `frontend/components`.

Key frontend areas:

- `/dashboard`: authenticated user dashboard.
- `/portfolio`: portfolio dashboard with health, RAID, and overdue task summaries.
- `/projects`: searchable and sortable project list.
- `/projects/[id]`: project workspace with overview, health, team, tasks, and RAID sections.
- `/tasks`: authenticated "My Tasks" view.
- `/risks`, `/issues`, `/raid`, `/users`: focused operational pages.

The frontend API client lives in `frontend/lib/api/client.ts`. Feature modules in `frontend/features/*` re-export API functions and types for each domain.

## Backend

The backend is a NestJS application under `backend/src`. It uses module boundaries for auth, users, projects, tasks, risks, RAID, dashboard, portfolio, notifications, and integrations.

Runtime concerns:

- Controllers expose REST APIs and Swagger metadata.
- Services contain business logic and TypeORM repository access.
- TypeORM maps entities to PostgreSQL tables.
- `JwtAuthGuard` protects authenticated routes.
- `SanitizeResponseInterceptor` removes sensitive fields such as `passwordHash` from API responses.
- `ProjectHealthService` centralizes project health calculation and is reused by Projects, Dashboard, and Portfolio.

## PostgreSQL

PostgreSQL is the system of record. TypeORM entities are explicitly registered through `databaseEntities` in `backend/src/database/typeorm.config.ts`.

Core persisted data includes:

- Users, roles, permissions, and role permissions.
- Projects and project members.
- Tasks.
- RAID records: risks, issues, assumptions, dependencies.
- Notifications.

`synchronize` is disabled, so schema management should be handled through migrations or SQL initialization scripts.

## Redis

Redis is included in Docker Compose as a supporting infrastructure service. The current codebase does not yet contain application-level Redis consumers. It is available for future queueing, caching, distributed locks, session metadata, or notification delivery workflows.

## MinIO

MinIO is included in Docker Compose for object storage and is configured through backend environment variables. The current core project, task, dashboard, portfolio, and RAID flows do not yet persist files to MinIO. It is intended for future document attachments, exported reports, and integration artifacts.

## Docker Deployment

`docker-compose.yml` defines five services:

- `postgres`: PostgreSQL 17, exposed on host port `5432`.
- `redis`: Redis 7 with a persistent volume.
- `minio`: MinIO object storage, API on `9000`, console on `9001`.
- `backend`: NestJS production build, exposed on host port `3001` and container port `3000`.
- `frontend`: Next.js production build, exposed on host port `3000`.

The backend Dockerfile builds TypeScript to `dist` and runs `npm run start:prod`. The frontend Dockerfile builds `.next` and runs `npm start`.

## Authentication Flow

```text
User submits email/password
        |
        v
POST /auth/login or POST /auth/register
        |
        v
AuthService validates credentials or creates user
        |
        v
JWT access token + refresh token returned in SessionDto
        |
        v
Frontend stores tokens in localStorage
        |
        v
API client sends Authorization: Bearer <token>
        |
        v
JwtStrategy validates token and attaches user to request
        |
        v
JwtAuthGuard allows protected controller methods
```

Registration creates a user with a hashed password. Login fetches `passwordHash` using a query path that explicitly selects it because the entity column is excluded from normal selects. API responses are sanitized to avoid leaking internal security fields.

## Portfolio Reporting Flow

```text
GET /portfolio/summary
        |
        v
PortfolioController
        |
        v
PortfolioService
        |
        +--> Project repository loads projects with tasks, risks, issues
        |       |
        |       v
        |   ProjectHealthService calculates GREEN/AMBER/RED
        |
        +--> Risk repository counts open risks by impact severity
        |
        +--> Issue repository counts open issues by severity/priority
        |
        +--> Task repository counts incomplete overdue tasks by project
        |
        v
PortfolioSummaryDto returned to frontend
        |
        v
/portfolio renders summary cards and linked project lists
```

Portfolio reporting reuses `ProjectHealthService` for health rules and keeps portfolio aggregation logic inside `PortfolioService`.
