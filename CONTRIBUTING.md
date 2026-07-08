# Contributing

Thank you for contributing to PM Platform.

PM Platform is an enterprise project, portfolio, planning, and RAID management
platform built with NestJS, Next.js, TypeScript, PostgreSQL, and Docker Compose.

## Documentation First

Start with the documentation index:

- [docs/README.md](docs/README.md)

Important references:

- [Architecture](docs/architecture/README.md)
- [Architecture Decision Records](docs/README.md#architecture-decision-records-adr)
- [Product Documentation](docs/product/README.md)
- [Roadmap](docs/roadmap/README.md)
- [Release Documentation](docs/releases/README.md)

## Repository Layout

| Path | Purpose |
| --- | --- |
| `backend/` | NestJS API, domain modules, TypeORM entities, database schema, migrations, and backend tests. |
| `frontend/` | Next.js application, React components, frontend API client, and Vitest tests. |
| `docs/` | Product, architecture, release, testing, user guide, and review documentation. |
| `docker-compose.yml` | Local Docker Compose deployment entry point. |

## Local Development

### Backend

```bash
cd backend
npm install
npm run build
npm test
```

Useful backend scripts:

- `npm run start:dev`
- `npm run build`
- `npm test`
- `npm run test:e2e`
- `npm run lint`

### Frontend

```bash
cd frontend
npm install
npm run build
npm test
```

Useful frontend scripts:

- `npm run dev`
- `npm run build`
- `npm test`
- `npm run lint`

### Docker Compose

The root `docker-compose.yml` starts PostgreSQL, Redis, MinIO, backend, and
frontend services.

```bash
docker compose up --build
```

Default local ports:

- Frontend: `http://localhost:3000`
- Backend container mapping: `localhost:3001`
- PostgreSQL: `localhost:5432`
- MinIO: `localhost:9000`
- MinIO console: `localhost:9001`

## Development Expectations

- Follow existing NestJS, Next.js, and TypeScript patterns.
- Keep business rules in backend services, not only in the UI.
- Add or update tests for behavior changes.
- Keep documentation synchronized with implementation.
- Add ADRs for durable architectural decisions.
- Add release notes for release-level changes.
- Avoid unrelated refactoring in focused changes.

## Testing Expectations

Run focused tests for the area changed.

Recommended minimum checks:

- Backend change: `cd backend && npm test`
- Frontend change: `cd frontend && npm test`
- Build-sensitive backend change: `cd backend && npm run build`
- Build-sensitive frontend change: `cd frontend && npm run build`

If a check cannot be run, document why in the change summary.

## Documentation Expectations

Use the appropriate documentation type:

| Documentation | Use For |
| --- | --- |
| ADR | Why an architecture decision was made. |
| Architecture | How the system is structured. |
| Product | What the product is and who it serves. |
| Roadmap | What is planned next. |
| Release notes | What shipped. |
| Reviews | Audits, investigations, and migration reports. |

## Pull Request Checklist

- Scope is focused.
- Tests were added or updated where appropriate.
- Relevant tests were run.
- Documentation was updated where behavior, architecture, deployment, or product
  direction changed.
- Security and permission implications were considered.
- Database migrations are additive or clearly documented.

## Security

Do not include secrets, tokens, production data, or credentials in commits.

For vulnerability reporting, see [SECURITY.md](SECURITY.md).
