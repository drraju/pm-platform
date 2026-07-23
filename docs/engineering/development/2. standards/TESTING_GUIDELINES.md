# Testing Guidelines

## Purpose

Testing protects enterprise workflows from regressions and gives UAT confidence before wider customer testing.

## Unit Testing

Unit tests should cover pure domain behavior:

- Scheduling rules.
- Rollups.
- Permission helpers.
- Formatters.
- Validation helpers.

## Integration Testing

Integration tests should cover service/database/API boundaries:

- DTO validation.
- Repository persistence.
- Migration assumptions.
- Authorization behavior.

## Frontend Testing

Frontend tests should focus on user-visible behavior:

- Rendering.
- Filters.
- Inline editing.
- Navigation.
- Empty states.
- Keyboard behavior.

## Backend Testing

Backend tests should verify:

- Service rules.
- Permission enforcement.
- Project visibility.
- Data consistency.
- Error handling.

## Regression Testing

Every UAT bug should receive a regression test when practical. If automated coverage is not practical, document manual UAT steps.

## Performance Testing

Performance scenarios should include:

- 500+ planning tasks.
- 1000+ planning tasks.
- Large RAID registers.
- Large project portfolios.
- Report generation with broad data.

## UAT

UAT should use documented test guides and bug logs. Each release candidate should identify scope, environment, roles, credentials, scenarios, and known issues.

## Release Checklist

- Build passes.
- Full automated tests pass.
- Migrations reviewed.
- Seed data validated.
- UAT smoke test completed.
- Release notes updated.

## Acceptance Criteria

Acceptance criteria should be behavior-oriented and testable. Avoid implementation-only criteria unless the change is architectural.

## Coverage Goals

Prioritize coverage of critical paths over raw percentages: authentication, permissions, project visibility, planning, task assignment, RAID, reporting, and deployment health.
# Testing Strategy

## Purpose

Define the PM Platform testing strategy across backend, frontend, integration, accessibility, performance, and release validation.

## Scope

This document covers test types, ownership, example commands, planning-engine test priorities, and quality gates.

## Audience

Backend engineers, frontend engineers, QA engineers, release managers, and product owners.

## Overview

Testing should protect enterprise project management workflows, authorization boundaries, data integrity, and planning correctness. The strategy combines unit tests, component tests, API integration tests, end-to-end checks, and release smoke validation.

## Contents

### Test Layers

| Layer | Purpose | Examples |
| --- | --- | --- |
| Unit | Validate isolated service or utility logic. | Planning graph validation, authorization policy decisions. |
| Component | Validate UI rendering and interaction. | Planning workspace collapse, dependency form, dashboard cards. |
| Integration | Validate API, database, and module behavior. | Project CRUD, RAID lifecycle, baseline persistence. |
| E2E | Validate user journeys across frontend and backend. | Login to dashboard to project workspace. |
| Accessibility | Validate keyboard and screen reader behavior. | Gantt controls, modal forms, navigation. |
| Performance | Validate large dataset behavior. | 500+ task planning workspace. |

### Common Commands

```bash
cd backend
npm test
```

```bash
cd frontend
npm test
```

### Backend Priorities

- Authorization and project visibility.
- Task hierarchy validation.
- Dependency validation and circular dependency prevention.
- Planning snapshot creation and transaction rollback.
- Critical path and schedule recalculation.
- RAID lifecycle and audit history.

### Frontend Priorities

- Route rendering.
- Form validation.
- API error handling.
- Keyboard accessibility.
- Responsive layout.
- Large planning workspace rendering.

### Planning Engine Test Priorities

1. Critical path correctness across parallel paths.
2. Dependency type and lag handling.
3. Schedule consistency after drag or resize.
4. Circular dependency prevention under concurrent edits.
5. Resource over-allocation detection.
6. Summary task rollups.

### Release Quality Gate

Before release, run:

- Backend unit and integration tests.
- Frontend component tests.
- Manual smoke test for dashboard, project workspace, planning workspace, and RAID.
- Migration verification.
- Known issue review.

## Related Documents

- [Coding Standards](coding-standards.md)
- [Backend Architecture](../architecture/backend.md)
- [Frontend Architecture](../architecture/frontend.md)
- [v1.1.1 Planning Engine](../architecture/v1.1.1-planning-engine.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created testing strategy framework. |
