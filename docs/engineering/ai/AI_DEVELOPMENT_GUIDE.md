# AI Development Guide

This guide is the quick authoritative reference for AI coding assistants and contributors working on PM Platform. Read this before making changes.

For the full project guide, see [docs/PM_PLATFORM_MASTER_GUIDE.md](docs/PM_PLATFORM_MASTER_GUIDE.md).

## 1. Prime Directive

PM Platform is an enterprise project management platform. Preserve stability first, then extend capability.

Before changing code:

- Read the user request carefully.
- Identify whether the task is implementation, review, investigation, or documentation.
- Inspect the repository before designing.
- Keep changes scoped to the requested feature.
- Do not modify protected modules unless explicitly allowed.
- Do not revert user changes.
- Do not create commits unless explicitly requested.

## 2. Core Architectural Principles

| Principle | Rule |
| --- | --- |
| Scheduling isolation | Scheduling Engine owns CPM, float, scheduling, dependencies, and critical path. |
| Planning consumes scheduling | Planning prepares context and consumes deterministic scheduling output. |
| Calendars do not schedule | Calendars own working hours, holidays, and exception days only. |
| Resources do not schedule directly | Resources own future capacity, availability, skills, and cost. |
| API first | Frontend consumes backend REST APIs through the shared API client. |
| Feature ownership | Backend modules and frontend features own their domain behavior. |
| Thin controllers | Controllers route requests and delegate to services. |
| DTO boundary | Public APIs should use DTOs and avoid leaking persistence details. |
| Additive database changes | Database changes must preserve existing data and behavior. |
| Tests are required | Feature work is incomplete until relevant tests and builds pass. |

## 3. Non-Negotiable Scheduling Boundary

The scheduling pipeline is:

```text
PlanningService
  -> SchedulingContextFactory
  -> SchedulingContext
  -> PlanningScheduleEngineService
  -> PlanningGraphBuilderService
  -> PlanningForwardPassService
  -> PlanningBackwardPassService
  -> PlanningFloatService
  -> PlanningCriticalPathService
```

Rules:

- No `SchedulingContext` database table.
- No public `SchedulingContext` API.
- Scheduling Engine must not import Calendar entities.
- Scheduling Engine must not access persistence.
- Calendar services must not mutate schedules.
- Resource services must not directly change schedule dates.
- Administrative UI must not trigger hidden schedule mutation.

Read: [Scheduling Architecture](docs/architecture/05-SCHEDULING-ARCHITECTURE.md).

## 4. Repository Structure

```text
backend/
  src/common/          Shared authz, base entities, scheduling adapters, serialization
  src/database/        Baseline schema, migrations, TypeORM config
  src/modules/         NestJS feature modules

frontend/
  app/                 Next.js routes
  components/          Shared and domain UI components
  features/            Feature APIs, hooks, types, constants, business UI
  hooks/               Shared hooks
  lib/api/             Shared API client
  lib/config/          Runtime config
  tests/               Vitest tests

docs/
  PM_PLATFORM_MASTER_GUIDE.md
  BUILD_PLAYBOOK.md
  FEATURE_PROGRESS.md
  architecture/
  planning/v1.1/
```

Important docs:

- [Master Guide](docs/PM_PLATFORM_MASTER_GUIDE.md)
- [Build Playbook](docs/BUILD_PLAYBOOK.md)
- [Architecture Index](docs/architecture/README.md)
- [Backend Architecture](docs/architecture/03-BACKEND-ARCHITECTURE.md)
- [Frontend Architecture](docs/architecture/04-FRONTEND-ARCHITECTURE.md)
- [Database Architecture](docs/architecture/06-DATABASE-ARCHITECTURE.md)
- [Security Architecture](docs/architecture/07-SECURITY-ARCHITECTURE.md)
- [Coding Standards](docs/architecture/09-CODING-STANDARDS.md)

## 5. Required Development Workflow

Every substantial feature follows:

1. Requirements Review.
2. Repository Investigation.
3. Architecture Gap Analysis.
4. ADR Review.
5. ADR Creation & Approval, if required.
6. Architecture Design Document (ADD).
7. Technical Design Review.
7.5 Architecture Baseline Commit.
8. Codex Implementation.
9. Implementation Review.
10. Testing.
11. Docker Verification.
12. Ubuntu Verification.
13. Documentation Update.
14. Single Feature Commit.

As an AI assistant:

- Follow the lifecycle sequentially.
- Never skip stages.
- Never implement before Technical Design Review approval.
- Recommend an Architecture Baseline Commit before implementation.
- Resume work by consulting [Feature Progress](docs/FEATURE_PROGRESS.md).
- Preserve ADRs and ADDs as the authoritative design documents.
- Use existing code as the source of truth.

Implementation must not begin until Stage 7 and Stage 7.5 are complete.

## 6. Backend Coding Conventions

Backend stack:

- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- Jest

Feature shape:

```text
backend/src/modules/<feature>/
  dto/
  entities/
  tests/
  <feature>.controller.ts
  <feature>.module.ts
  <feature>.service.ts
```

Rules:

- Controllers are thin.
- Services own business rules.
- Use DTOs with class-validator for request payloads.
- Use response DTOs for public API boundaries where defined.
- Use TypeORM repositories through dependency injection.
- Keep validation out of controllers except DTO validation/decorators.
- Use Nest exceptions for platform error style.
- Keep existing APIs backward compatible.
- Do not duplicate persistence logic.

## 7. Frontend Coding Conventions

Frontend stack:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vitest + Testing Library

Feature shape:

```text
frontend/features/<feature>/
  api/
  components/
  hooks/
  constants.ts
  index.ts
  types.ts
```

Rules:

- Keep `frontend/app` pages thin.
- Put business UI logic in `frontend/features`.
- Use `frontend/lib/api/client.ts`; do not duplicate fetch helpers.
- Use React hooks and feature hooks for state.
- Reuse shared UI components where possible.
- Match existing Tailwind styling.
- Do not introduce Material UI, Ant Design, Chakra, Bootstrap, Redux, Zustand, or MobX without an ADR.

## 8. Database Conventions

Database rules:

- Use additive SQL migrations.
- Preserve existing data.
- Prefer `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` where practical.
- Use audit fields and soft-delete patterns where appropriate.
- Add indexes for new lookup patterns.
- Do not create destructive migrations without explicit approval.
- Do not create persistence for internal adapters such as `SchedulingContext`.

Current schema references:

- `backend/src/database/schema/001_initial_schema.sql`
- `backend/src/database/migrations`
- `backend/src/database/typeorm.config.ts`

## 9. Security Conventions

Current security model:

- JWT authentication.
- Permission-based authorization.
- `JwtAuthGuard`.
- `PermissionsGuard`.
- Role and permission tables.
- Project visibility through global permissions, governance roles, membership, and selected task-assignment expansion.

Rules:

- Do not bypass guards for protected APIs.
- Do not expose password hashes or sensitive fields.
- Use existing permission keys unless a feature explicitly adds new permissions.
- Preserve project visibility behavior.

## 10. Testing Expectations

Run tests appropriate to the changed area.

Backend:

```bash
cd backend
npm test
npm run build
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

Docker/deployment changes:

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose exec backend wget -qO- http://127.0.0.1:3000/health
docker compose exec frontend wget -qO- http://127.0.0.1:3000/api/health
```

Testing requirements by feature:

| Change | Expected Tests |
| --- | --- |
| Backend service | Unit tests for service behavior and validation. |
| Backend controller/API | Controller tests and API/integration-style tests. |
| Frontend page/component | Vitest + Testing Library tests with mocked APIs. |
| Scheduling | Scheduling engine tests and planning regression tests. |
| Database | Migration/schema tests plus affected backend tests. |
| Auth/visibility | Permission and isolation tests. |

## 11. Review Checklist

Before final response or commit:

- Scope matches the prompt.
- Protected modules are unchanged.
- Existing user changes are preserved.
- Controllers are thin.
- Services own business rules.
- DTOs validate input.
- Responses do not leak sensitive fields.
- Database changes are additive.
- Scheduling boundary is preserved.
- Frontend uses existing feature and API patterns.
- Relevant tests/builds pass.
- Any skipped verification is reported.
- No commit is created unless requested.

## 12. Common Pitfalls

Avoid:

- Modifying Scheduling Engine during calendar/resource/admin UI work.
- Adding public APIs for internal adapters.
- Creating `SchedulingContext` tables.
- Returning entities from new public API boundaries.
- Duplicating API fetch helpers.
- Adding frontend state or UI frameworks without approval.
- Making broad refactors during feature work.
- Editing unrelated files.
- Treating roadmap items as implemented.
- Running destructive git commands.
- Reverting user changes.

## 13. Documentation Rules

For documentation-only tasks:

- Modify only documentation paths requested by the user.
- Do not touch application code.
- Do not run unnecessary builds unless requested.
- Document current implementation accurately.
- Label future roadmap items as future.

For architecture-affecting code tasks:

- Update relevant architecture docs or ADRs when requested.
- Cross-link new docs from the master guide or architecture index when appropriate.

## 14. AI Assistant Operating Rules

When implementing:

- Prefer `rg` for search.
- Read existing files before editing.
- Use `apply_patch` for manual edits.
- Keep edits small and coherent.
- Run commands from the correct package directory.
- Report command results clearly.
- Ask only when blocked by missing information that cannot be discovered.

When reviewing:

- Lead with findings.
- Prioritize bugs, regressions, missing tests, and architectural violations.
- Use file and line references.

When investigating:

- Do not modify code.
- Produce inventories and facts from the repository.
- Avoid recommendations unless requested.

## 15. Key ADRs

- [ADR-001 Feature Architecture](docs/architecture/adr/ADR-001-feature-architecture.md)
- [ADR-002 Calendar Architecture](docs/architecture/adr/ADR-002-calendar-architecture.md)
- [ADR-003 Scheduling Isolation](docs/architecture/adr/ADR-003-scheduling-isolation.md)
- [ADR-004 API Design](docs/architecture/adr/ADR-004-api-design.md)
- [ADR-005 Frontend Architecture](docs/architecture/adr/ADR-005-frontend-architecture.md)

## 16. Roadmap Snapshot

Completed/current:

- Core Platform
- Project Management
- Task Management
- Planning
- Portfolio
- RAID
- Executive Dashboard
- Enterprise Calendar

Future:

- v1.2 Resource Management
- v1.3 Scheduling Engine Integration
- v1.4 Gantt
- v1.5 Capacity Planning
- v1.6 Portfolio Scheduling
- v2 AI Project Manager
- v3 SaaS Multi-tenancy

Read: [Roadmap](docs/architecture/10-ROADMAP.md).
