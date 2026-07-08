# PM Platform Build Playbook

This playbook is the primary onboarding guide for contributors and AI coding assistants. It describes how to extend the PM Platform without breaking the architecture that is already in place.

## Project Philosophy

PM Platform is an enterprise project management system built around stable project execution workflows: projects, tasks, planning, RAID, portfolio reporting, dashboards, notifications, integrations, and enterprise calendars.

Core principles:

- Preserve existing user workflows before expanding capability.
- Treat scheduling as a deterministic domain, not a UI side effect.
- Prefer additive schema and API changes.
- Keep feature work small enough to review, test, deploy, and rollback.
- Document architecture before implementing large changes.

## Architecture Principles

| Principle | Rule |
| --- | --- |
| Scheduling isolation | Planning may consume the Scheduling Engine; calendars and resources must not mutate schedules directly. |
| API first | Backend REST contracts are the source for frontend feature integrations. |
| Feature ownership | Backend modules and frontend features own their domain behavior. |
| Thin controllers | Controllers route requests, apply guards, and delegate to services. |
| DTO boundary | Public APIs return DTOs, not persistence entities, when a feature-specific DTO exists. |
| Additive database | Migrations should add tables, columns, indexes, and constraints without destructive changes. |
| Test before release | Backend Jest, frontend Vitest, builds, Docker, and health checks are release gates. |

## Repository Layout

```text
backend/
  src/common/          Shared authz, entities, scheduling adapters, serialization
  src/database/        Baseline schema, migrations, TypeORM config
  src/modules/         NestJS bounded-context modules

frontend/
  app/                 Next.js routes
  components/          Shared and domain UI components
  features/            Feature APIs, hooks, types, and business UI logic
  lib/api/             Shared API client
  hooks/               Shared hooks
  tests/               Vitest and Testing Library tests

docs/
  architecture/        Current architecture and ADRs
  planning/v1.1/       Approved v1.1 product and technical planning
```

## Mandatory Feature Workflow

Every feature follows this sequence:

1. Requirements Review.
2. Repository Investigation.
3. Architecture Gap Analysis.
4. Architecture Design Document.
5. Codex Prompt.
6. Implementation.
7. Architecture Review.
8. Code Review.
9. Testing.
10. Docker Verification.
11. Ubuntu Verification.
12. Single Feature Commit.

Do not skip investigation. Existing code is the source of truth.

## Prompt Engineering Workflow

Prompts should include:

- Branch and baseline commit.
- Feature objective.
- In-scope and out-of-scope items.
- Mandatory invariants.
- Files or modules that must not change.
- Required tests and verification.
- Expected final report format.

For scheduling-related work, explicitly state whether the Scheduling Engine may be modified. Most calendar, resource, UI, and persistence work should leave it unchanged.

## Coding Conventions

- Use NestJS modules for backend features.
- Use TypeORM repositories through dependency injection.
- Use class-validator DTOs for incoming payloads.
- Keep validation in DTOs and services, not controllers.
- Use frontend `features/<feature>` for feature-specific API, hooks, types, and components.
- Reuse `frontend/lib/api/client.ts`.
- Reuse shared modal, page header, layout, and table patterns before creating new UI primitives.

See [Coding Standards](architecture/09-CODING-STANDARDS.md).

## Testing Strategy

| Layer | Tool | Current Pattern |
| --- | --- | --- |
| Backend unit/integration | Jest | `backend/src/**/*.spec.ts` |
| Frontend UI | Vitest + Testing Library | `frontend/tests/*.test.tsx` |
| Build verification | Nest/Next build | `npm run build` in each app |
| Docker verification | Docker Compose | Compose build, up, health checks |

Common commands:

```bash
cd backend
npm test
npm run build

cd ../frontend
npm test
npm run build
```

## Docker Workflow

The root `docker-compose.yml` starts:

- PostgreSQL 17
- Redis 7
- MinIO
- Backend
- Frontend

Backend listens on host port `3001`; frontend listens on host port `3000`. Backend and frontend images are built from `backend/Dockerfile` and `frontend/Dockerfile`.

Typical verification:

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose exec backend wget -qO- http://127.0.0.1:3000/health
docker compose exec frontend wget -qO- http://127.0.0.1:3000/api/health
```

## Ubuntu Deployment Workflow

Ubuntu deployment should follow the same Compose model:

1. Install Docker Engine and Docker Compose plugin.
2. Clone the repository.
3. Configure environment variables such as `FRONTEND_ORIGIN` and `NEXT_PUBLIC_API_URL`.
4. Run `docker compose build`.
5. Run `docker compose up -d`.
6. Verify Postgres, Redis, MinIO, backend health, and frontend health.
7. Capture logs for failed services before making changes.

## Git Workflow

- Work on the feature branch named in the prompt.
- Keep one feature per commit.
- Do not commit generated or unrelated changes.
- Never revert user changes without explicit instruction.
- Before commit, run status and review the diff:

```bash
git status --short
git diff --name-only
```

## Common Mistakes

- Modifying the Scheduling Engine during calendar/resource UI work.
- Exposing persistence entities directly from new APIs.
- Creating parallel fetch utilities instead of using `frontend/lib/api/client.ts`.
- Adding database changes outside migrations.
- Introducing a UI framework instead of Tailwind/shared components.
- Treating roadmap items as implemented architecture.

## Review Checklist

- Scope matches prompt and approved architecture.
- Protected modules are unchanged.
- Controllers are thin.
- Services own business rules.
- DTOs are validated.
- API responses do not leak sensitive fields.
- Database changes are additive.
- Tests cover happy path, validation, permissions, and isolation.
- Frontend uses existing layout, API, and state patterns.

## Release Checklist

- Backend tests pass.
- Frontend tests pass.
- Backend build passes.
- Frontend build passes.
- Docker build passes.
- Docker Compose services are healthy.
- Ubuntu deployment path remains compatible.
- Release notes and architecture docs are updated.

