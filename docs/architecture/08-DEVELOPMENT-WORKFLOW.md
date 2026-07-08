# Development Workflow

All non-trivial features must use the following workflow.

## Mandatory Steps

1. Requirements Review
2. Repository Investigation
3. Architecture Gap Analysis
4. Architecture Design Document
5. Codex Prompt
6. Implementation
7. Architecture Review
8. Code Review
9. Testing
10. Docker Verification
11. Ubuntu Verification
12. Single Feature Commit

## Requirements Review

Confirm:

- Feature objective.
- In scope and out of scope.
- Protected modules.
- Backward compatibility constraints.
- Required tests.

## Repository Investigation

Inspect existing code before proposing design. Prefer `rg` and targeted file reads. Record existing modules, entities, APIs, DTOs, frontend components, tests, and migrations.

## Architecture Gap Analysis

Identify what exists, what is missing, and what must remain stable. Do not implement from assumptions.

## Architecture Design Document

ADDs should include scope, goals, principles, alternatives, recommended design, module ownership, service boundaries, database design, risks, acceptance criteria, and definition of done.

## Implementation

Implement only the approved feature. Avoid opportunistic refactors.

## Verification

Minimum verification depends on feature scope:

- Backend feature: backend tests and build.
- Frontend feature: frontend tests and build.
- Database/Docker feature: Docker build, Compose health, migrations.
- Scheduling feature: scheduling unit tests and planning regression tests.

## Commit Policy

Commit only after the feature is complete and verified. Each feature should be a single coherent commit unless the user requests otherwise.

