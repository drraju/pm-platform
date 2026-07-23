# PM Platform Quality Gates

Engineering Governance Version: 1.0

Start here:
[ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)

Authoritative Scope:
Defines the authoritative quality gates and approval checkpoints that every PM Platform feature must pass before completion.

This document defines the mandatory quality gates that every PM Platform feature must pass before it is considered complete.

Quality gates are part of the Architecture-First Development Process. They are intended for human contributors, reviewers, and AI coding assistants working on feature delivery, review, and release readiness.

The canonical engineering Stage model is defined in [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md). This document applies quality gates to that Stage model rather than defining a separate lifecycle vocabulary.

---

## 1. Purpose

Quality Gates exist to protect the consistency and reliability of PM Platform delivery.

They ensure:

- architecture consistency
- enterprise quality
- maintainability
- predictable releases
- AI-assisted development discipline

Quality Gates are not optional review preferences. They are the minimum approval criteria for considering a feature complete.

## 2. Quality Gate Overview

| Gate | Mandatory | Description |
| ---- | --------- | ----------- |
| Requirements Review | Yes | Confirms feature identity, scope, dependencies, constraints, and explicit out-of-scope items before design or implementation begins. |
| Repository Investigation | Yes | Verifies the existing repository structure, reusable patterns, protected modules, and current implementation reality. |
| Architecture Review | Yes | Confirms the feature design preserves approved bounded contexts, dependency direction, and platform invariants. |
| ADR Review (when required) | Conditional | Required when the feature introduces or depends on architectural decisions not fully governed by existing ADRs. |
| Persistence Review | Yes | Verifies entities, migrations, indexes, audit behavior, and additive schema changes follow repository conventions. |
| DTO & Validation Review | Yes | Confirms request/response contracts, mapper boundaries, and validation responsibilities are correctly separated. |
| Application Service Review | Yes | Verifies business logic remains in services, orchestration stays cohesive, and application boundaries remain clean. |
| API Review | Yes when APIs are in scope | Confirms controllers remain thin, authentication and authorization are preserved, and REST behavior matches platform conventions. |
| Testing Review | Yes | Verifies required automated coverage exists, changed behavior is tested, and regression expectations are satisfied. |
| Documentation Review | Yes | Confirms feature progress, architecture traceability, ADR references, and process documentation are updated where required. |
| Final Approval | Yes | Confirms all prior gates have passed and the feature is ready for release workflow or final sign-off. |

## 3. Mandatory Verification

The following checks are required before a feature can pass its quality gates.

PM Platform is a monorepo. Backend and Frontend are separate Node projects. Verification commands must be executed from the correct project directory.

### Build

Backend

```bash
cd backend
npm run build
```

Frontend

```bash
cd ../frontend
npm run build
```

### Testing

Backend

```bash
npm test
```

### Docker

```bash
docker compose ps
docker compose logs backend --tail=50
```

## 4. Lint Policy

Lint expectations must be applied pragmatically and consistently.

- new or modified files must be lint clean
- existing repository lint debt does not block a feature by itself
- repository-wide lint cleanup must be planned and delivered separately

Lint review should focus on whether the feature introduces new lint debt, not whether the entire historical repository is already perfect.

## 5. Architecture Gate

Before approval, verify the following:

- Clean Architecture is maintained
- no transport DTO leakage into the application layer
- business logic remains in services
- controllers remain thin
- repository responsibilities are preserved
- transactions are correctly defined where required
- domain validation is implemented at the appropriate layer

This gate is mandatory even when a feature compiles and tests successfully. Passing execution checks does not automatically prove architectural compliance.

## 6. Documentation Gate

Before final approval, verify:

- feature progress is updated
- ADRs are updated when applicable
- architecture documents are updated where required
- the development playbook is updated if the process changes

Documentation must accurately reflect the implementation and the approved architecture baseline.

## 7. Definition of Pass

A feature passes its Quality Gates only if all required approvals are satisfied.

A feature passes only if:

- build passes
- tests pass
- new code is lint clean
- documentation is updated
- architecture is approved
- review is approved

If one required gate fails, the feature is not complete.

## 8. Future Enhancements

This section reserves space for future Quality Gates that may become mandatory as the platform matures.

Future gate categories may include:

- performance
- security
- observability
- AI readiness
- accessibility
- scalability

These items are intentionally deferred until the repository introduces formal policy, tooling, and approval expectations for them.

---

## Related Governance Documents

- [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)
- [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
