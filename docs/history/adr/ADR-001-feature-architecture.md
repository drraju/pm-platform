# ADR-001: Feature Architecture

## Status

Accepted.

## Context

The platform contains multiple business capabilities: projects, tasks, planning, RAID, portfolio, dashboards, notifications, integrations, users, and calendars. Backend code is organized as NestJS modules under `backend/src/modules`. Frontend code uses Next.js routes, shared components, and feature folders under `frontend/features`.

## Decision

Each capability should be implemented as a feature with clear ownership:

- Backend feature modules own controllers, services, DTOs, entities, and tests.
- Frontend feature folders own API wrappers, hooks, types, constants, and feature-specific components.
- Shared infrastructure belongs in `common`, `components`, `hooks`, or `lib` only when reused by multiple features.

## Consequences

- New features are easier to investigate and review.
- Business logic remains close to the feature that owns it.
- Shared abstractions must justify reuse.
- Large cross-cutting changes require explicit architecture review.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Layer-only folders for all controllers/services/entities | Makes feature ownership harder to reason about. |
| Frontend global state architecture | Current app does not need Redux/Zustand/MobX and uses feature hooks successfully. |
| Shared generic CRUD framework | Would add abstraction before the domain patterns are stable. |

## Future Implications

Resource Management, Gantt, Capacity Planning, and AI features should follow the same feature-based structure unless a future ADR changes the pattern.

