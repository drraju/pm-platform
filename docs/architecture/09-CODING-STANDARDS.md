# Coding Standards

## General

- Follow existing repository conventions.
- Prefer small, cohesive services and components.
- Avoid duplicated logic.
- Keep business rules out of controllers.
- Keep UI business logic out of route pages.
- Add tests with new behavior.

## Backend

| Area | Standard |
| --- | --- |
| Modules | Use NestJS feature modules under `backend/src/modules`. |
| Controllers | Thin route layer with guards, decorators, params, body DTOs. |
| Services | Business rules, validation, orchestration, repository calls. |
| DTOs | class-validator decorators for request payloads; response DTOs at public boundaries. |
| Persistence | TypeORM repositories injected through DI. |
| Entities | Use common base/audit entities where appropriate. |
| Errors | Use Nest exceptions: 400, 403, 404, 409, 422 as appropriate. |
| Tests | Jest specs near feature code. |

## Frontend

| Area | Standard |
| --- | --- |
| Routes | Thin Next.js pages under `app`. |
| Features | Business UI, hooks, API wrappers, types under `features/<feature>`. |
| API | Use `frontend/lib/api/client.ts`. |
| Styling | Tailwind and shared components only. |
| State | React hooks and feature hooks; no Redux/Zustand/MobX without ADR. |
| Tests | Vitest + Testing Library under `frontend/tests`. |

## Naming

- Backend files use kebab-case.
- Backend classes use PascalCase.
- DTO classes end with `Dto`.
- Services end with `Service`.
- Controllers end with `Controller`.
- Frontend components use PascalCase filenames.
- Feature API functions use verb-noun names such as `getCalendars`, `createCalendar`.

## Documentation

Architecture-affecting changes should update docs and ADRs. Roadmap items must be labeled as future work unless implemented.

