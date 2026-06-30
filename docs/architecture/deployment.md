# Deployment Architecture

## Purpose

Deployment architecture defines how the PM Platform runs consistently across local development, Mac Apple Silicon, Ubuntu UAT, Docker Compose, and future production-grade infrastructure.

## Local Development

Local development should support fast iteration for frontend, backend, and database workflows. Developers should use documented environment variables, seeded data, and repeatable commands.

## Mac Apple Silicon

Mac Apple Silicon development should prefer native Node.js for fast application work and Docker Compose for PostgreSQL and integrated environment validation. Architecture-specific Docker image issues should be documented when discovered.

## Ubuntu

Ubuntu is the reference UAT environment. UAT deployment should validate:

- Docker installation.
- Environment file presence.
- Database migrations.
- Seed data.
- Service health checks.
- Browser access to frontend.

## Docker Compose

Docker Compose is the primary self-hosted deployment path.

```text
docker compose
  |-- frontend
  |-- backend
  |-- postgres
  |-- volumes
  |-- network
```

## Environment Variables

Environment variables should define:

- Database connection.
- JWT secret.
- Frontend API base URL.
- CORS origins.
- Integration credentials.
- Future AI provider credentials.

## Backups

Backups should include:

- PostgreSQL dumps.
- Volume backups.
- Environment configuration inventory.
- Release version metadata.

## Upgrade Process

1. Review release notes.
2. Back up database and configuration.
3. Pull release artifacts.
4. Apply migrations.
5. Restart services.
6. Run health checks.
7. Execute smoke tests.

## Rollback Strategy

Rollback requires a known good application version and compatible database backup. Schema migrations must be classified as reversible or backup-required.

## Monitoring and Logging

Current deployment should expose application logs and health endpoints. Future production deployment should add metrics, structured logs, uptime checks, and alerting.

## Future Kubernetes and High Availability

Future Kubernetes architecture may introduce:

- Horizontal scaling for frontend/backend.
- Managed PostgreSQL.
- Ingress and TLS automation.
- Secret manager integration.
- Zero-downtime deployment.
- Backup and restore automation.
