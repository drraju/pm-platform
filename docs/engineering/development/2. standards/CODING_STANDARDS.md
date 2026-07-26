# Coding Standards

## Naming Conventions

| Area | Standard |
| --- | --- |
| TypeScript types | PascalCase |
| React components | PascalCase |
| Hooks | `useSomething` |
| Backend services | `DomainService` |
| DTOs | `CreateXDto`, `UpdateXDto`, `XResponseDto` |
| Database columns | snake_case |
| API fields | camelCase |

## Folder Structure

Frontend code should group reusable UI under `components`, API contracts under `lib/api`, and domain helpers under `features` or dedicated hooks. Backend code should keep NestJS modules cohesive with controller, service, DTO, entity, and tests in the owning module.

## Components

- Keep components focused on presentation and interaction.
- Extract shared controls when two or more modules need the same behavior.
- Avoid duplicating domain rules in multiple components.
- Use accessible labels for interactive controls.

## Hooks

Hooks should encapsulate reusable client-side state, data loading, and derived view models. Hooks should not hide backend validation rules.

## Backend Modules

Each module owns a clear domain boundary. Services contain business rules. Controllers should remain thin and route-oriented.

## DTOs

DTOs define public contracts and validation. Avoid accepting broad untyped objects. Use enums for controlled values and explicit nullable fields where clearing values is supported.

## Services

Services own business rules, authorization collaboration, validation, and persistence orchestration. Scheduling rules belong in Planning, not in UI or reporting.

## Repositories

Use repositories for persistence access. Keep query behavior close to the service that owns the domain.

## Testing

- Unit test domain rules.
- Integration test API and persistence boundaries.
- Frontend test user-visible workflows.
- Add regression tests for UAT findings.

## Comments

Use comments for non-obvious decisions, edge cases, and domain constraints. Do not comment self-explanatory assignments.

## Documentation

Architecture-affecting changes require updates to architecture docs or ADRs. Product behavior changes require user or release documentation.

## Architecture Rules

- Backend is the final authority for validation.
- Frontend must prevent invalid inputs where possible.
- Do not create parallel models for the same concept.
- Prefer typed domain helpers over ad hoc string manipulation.

## Security Coding Standards
SR-001 Password Hashing

SR-002 Password Validation

SR-003 Password Workflow

SR-004 JWT Handling

SR-005 Secrets Management

SR-006 Encryption

SR-007 Audit Logging

SR-008 Input Validation

SR-009 Authorization Checks

SR-010 Sensitive Data Logging