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
