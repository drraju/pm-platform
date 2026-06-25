# Branching Strategy

## Purpose

Define the branch model, naming conventions, merge expectations, and release branch process for PM Platform.

## Scope

This document covers Git workflow for feature development, release stabilization, hotfixes, reviews, and documentation changes.

## Audience

Engineers, QA engineers, release managers, product owners, and technical reviewers.

## Overview

PM Platform should use a simple trunk-oriented workflow with short-lived feature branches and explicit release branches when stabilization is required. Branches should be small, reviewable, and tied to a clearly described product or engineering objective.

## Contents

### Branch Model

```text
main
|-- develop
|-- release/v1.1.1-planning-engine
|-- feature/planning-cpm-validation
|-- fix/planning-cycle-race
`-- docs/documentation-framework
```

### Branch Types

| Branch | Purpose | Example |
| --- | --- | --- |
| `main` | Stable release-ready branch. | `main` |
| `develop` | Integration branch when parallel feature work requires staging. | `develop` |
| `feature/*` | New product or technical capability. | `feature/resource-capacity-grid` |
| `fix/*` | Defect correction. | `fix/planning-dependency-validation` |
| `docs/*` | Documentation-only change. | `docs/product-roadmap-refresh` |
| `release/*` | Stabilization branch for a named release. | `release/v1.1.1-planning-engine` |
| `hotfix/*` | Urgent production correction. | `hotfix/login-session-expiry` |

### Commit Conventions

Use concise imperative commit messages:

```text
docs: add planning engine stabilization guide
fix: prevent circular planning dependencies
test: add planning workspace large schedule coverage
```

Recommended prefixes:

- `feat`
- `fix`
- `docs`
- `test`
- `refactor`
- `chore`
- `build`

### Pull Request Process

1. Keep the PR scoped to one logical change.
2. Include context, screenshots where UI changes exist, and test evidence.
3. Link related product, architecture, or release documents.
4. Request review from the owning area.
5. Resolve comments with follow-up commits rather than force-pushing during active review unless agreed.

### Release Workflow

1. Create a `release/*` branch from the integration branch.
2. Freeze major functionality.
3. Run backend, frontend, and integration test suites.
4. Update release notes.
5. Merge to `main`.
6. Tag the release.

## Related Documents

- [Coding Standards](coding-standards.md)
- [Testing Strategy](testing.md)
- [Deployment Workflow](deployment.md)
- [Product Roadmap](../product/product-roadmap.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created branching strategy framework. |
