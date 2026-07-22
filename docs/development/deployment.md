# Deployment Workflow

## Purpose

Describe the deployment workflow for PM Platform environments.

## Scope

This document covers Docker Compose deployment, environment configuration, database schema changes, verification, rollback considerations, and release handoff.

## Audience

DevOps owners, backend engineers, frontend engineers, QA engineers, and release managers.

## Overview

PM Platform is designed for Docker-based deployment with a Next.js frontend, NestJS backend, and PostgreSQL database. Deployment should be repeatable, migration-aware, and verified through health checks and smoke tests before release completion.

## Contents

### Deployment Architecture

```text
Host
|-- Docker Compose
|   |-- frontend
|   |-- backend
|   `-- postgres
`-- persistent database volume
```

### Environment Configuration

| Variable Area | Purpose |
| --- | --- |
| PostgreSQL | Host, port, database, user, and password. |
| Backend | API port, JWT configuration, CORS origin, and database connection. |
| Frontend | API base URL and public runtime configuration. |
| Integrations | Slack credentials when enabled. Document links do not require external storage credentials. |

Document links do not require OAuth client IDs, API keys, provider refresh tokens, webhook secrets, or synchronization workers. Deployments only need the database migrations that create document reference data and project document metadata.

### Deployment Steps

1. Confirm release branch and tag candidate.
2. Review migration files and database backup requirements.
3. Build containers.
4. Start services with Docker Compose.
5. Apply database schema changes through the approved migration process.
6. Run backend health checks.
7. Run frontend smoke checks.
8. Validate login, project list, dashboard, RAID, and planning workspace.
9. Record release notes and deployment evidence.

### Database Changes

- Schema changes must be migration-based.
- Migrations should be idempotent where possible.
- New indexes should be reviewed for large-table impact.
- Destructive changes require explicit approval and rollback planning.
- Document reference data migrations should be idempotent and preserve existing project document metadata by mapping display values into reference rows.

### Rollback Considerations

- Keep database backups before release migrations.
- Prefer backward-compatible migrations.
- Document manual rollback steps for non-reversible migrations.
- Validate that old frontend and backend versions can tolerate migration state where required.

### Release Verification

| Check | Expected Result |
| --- | --- |
| Backend health endpoint | API responds successfully. |
| Frontend route load | App shell and key pages render. |
| Login | Valid users can authenticate. |
| Project workspace | Project data loads with expected authorization. |
| Planning workspace | Schedule data loads and does not error. |
| RAID | Register pages load and preserve project scoping. |

## Related Documents

- [System Architecture](../architecture/system-architecture.md)
- [Testing Strategy](testing.md)
- [Branching Strategy](branching-strategy.md)
- [v1.0.6 Release](../releases/v1.0.6.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created deployment workflow framework. |
