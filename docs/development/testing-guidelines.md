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
