# Coding Standards

## Purpose

Define coding standards for PM Platform application and documentation work.

## Scope

This document covers TypeScript, NestJS, Next.js, clean architecture, validation, testing, accessibility, and documentation expectations.

## Audience

Backend engineers, frontend engineers, QA engineers, reviewers, and technical leads.

## Overview

PM Platform should remain modular, testable, and enterprise-ready. Code should favor clear domain boundaries, explicit validation, predictable APIs, reusable UI components, and tests that protect critical workflows.

## Contents

### General Standards

- Use TypeScript consistently.
- Prefer explicit types at public boundaries.
- Keep functions focused and named by intent.
- Avoid hidden side effects in read operations.
- Keep documentation current when behavior changes.
- Follow existing repository patterns before introducing new abstractions.

### Backend Standards

| Area | Standard |
| --- | --- |
| Controllers | Thin request routing, DTO binding, and response delegation. |
| Services | Business logic, validation, orchestration, and transaction boundaries. |
| DTOs | Class-validator decorators for all request inputs. |
| Entities | Clear TypeORM mappings with explicit relationships. |
| Authorization | Use guards and project-scoped policy services. |
| Errors | Use NestJS exception types consistently. |

### Frontend Standards

| Area | Standard |
| --- | --- |
| Pages | Route-level composition and data loading. |
| Components | Reusable domain components with typed props. |
| API | Use shared API client and feature exports. |
| Accessibility | Use semantic controls, labels, focus states, and keyboard alternatives. |
| Layout | Prefer dense, operational UI for enterprise workflows. |
| State | Keep local state close to the component unless shared state is required. |

### Clean Architecture Expectations

```text
UI/API boundary
  -> application service
  -> domain validation
  -> persistence abstraction
  -> database
```

### Testing Standards

- Add service unit tests for business rules.
- Add frontend component tests for user interactions.
- Add integration tests for API contracts and authorization.
- Add regression tests for defects.
- Include performance coverage for large planning datasets.

### Documentation Standards

- Use Markdown that renders correctly on GitHub.
- Prefer tables for matrices and comparisons.
- Use ASCII diagrams for architecture.
- Link related documents.
- Maintain revision history.

## Related Documents

- [Branching Strategy](branching-strategy.md)
- [Testing Strategy](testing.md)
- [Backend Architecture](../architecture/backend.md)
- [Frontend Architecture](../architecture/frontend.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created coding standards framework. |
