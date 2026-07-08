# Development Workflow

All non-trivial features must use the following workflow.

## Mandatory Steps

1. Requirements Review
2. Repository Investigation
3. Architecture Gap Analysis
4. ADR Review
5. ADR Creation & Approval, if required
6. Architecture Design Document
7. Technical Design Review
7.5 Architecture Baseline Commit
8. Codex Implementation
9. Implementation Review
10. Testing
11. Docker Verification
12. Ubuntu Verification
13. Documentation Update
14. Single Feature Commit

Implementation must not begin until Stage 7 and Stage 7.5 are complete.

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

## ADR Review

Review existing Architecture Decision Records and determine whether they cover the decisions required for the feature.

## ADR Creation & Approval

Create or update ADRs only when the review identifies missing architectural decisions. ADR approval must happen before the ADD is treated as authoritative.

## Architecture Design Document

ADDs should include scope, goals, principles, recommended architecture, module ownership, integration boundaries, persistence strategy, risks, acceptance criteria, and definition of done. ADDs should not contain implementation code.

## Technical Design Review

Review the ADD and confirm it is ready to guide implementation. The review should resolve open architecture questions before coding begins.

## Architecture Baseline Commit

After Technical Design Review is approved, commit the completed architecture package before implementation begins.

This commit should include documentation only:

- Requirements Review.
- Repository Investigation.
- Architecture Gap Analysis.
- ADRs.
- Architecture Design Document.
- Architecture diagrams.
- Product roadmap updates.
- Architecture indexes.
- Design references.

No application source code should be included.

Example commit message:

```text
docs(architecture): complete Feature <feature-id> architecture package
```

Benefits:

- Architecture is versioned independently.
- Design review becomes traceable.
- Implementation has a stable baseline.
- Recovery after interrupted development is easier.
- Future architecture audits are simpler.

## Implementation

Implement only the approved feature. Avoid opportunistic refactors.

## Verification

Minimum verification depends on feature scope:

- Backend feature: backend tests and build.
- Frontend feature: frontend tests and build.
- Database/Docker feature: Docker build, Compose health, migrations.
- Scheduling feature: scheduling unit tests and planning regression tests.

## Commit Policy

Use two milestone commits for substantial features:

- Architecture Milestone: completed after Stage 7.5 and containing only architecture/product documentation.
- Implementation Milestone: completed after Stage 14 and containing the verified implementation plus required documentation updates.

Commit implementation only after the feature is complete and verified. Each feature implementation should be a single coherent commit unless the user requests otherwise.
