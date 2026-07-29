# PM Platform AI Development Playbook

Engineering Governance Version: 1.0

Start here:
[ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)

Authoritative Scope:
Defines how engineering Stages are executed in practice, including verification flow, prompts, and operating guidance for contributors and AI assistants.

This playbook defines the standard engineering workflow for PM Platform. It is intended for human contributors, reviewers, and AI coding assistants working on future features, epics, and releases.

The goal is to make architecture-first delivery repeatable, reviewable, and safe.

## Repository Structure

PM Platform is a monorepo.

```text
pm-platform/
│
├── backend/
│     package.json
│
├── frontend/
│     package.json
│
├── docs/
│
├── docker-compose.yml
│
└── README.md
```

Repository structure rules:

- `backend/` is an independent Node/NestJS project
- `frontend/` is an independent Node/Next.js project
- the repository root contains shared documentation and infrastructure
- the repository root does not contain a `package.json`
- npm commands must be executed inside the appropriate project directory

Verification rule:

- never run `npm install`, `npm run build`, or `npm test` from the repository root unless a root `package.json` actually exists

## 1. Vision

PM Platform is built as an enterprise project management system with stable operational boundaries. Engineering work should extend the platform without destabilizing existing scheduling, planning, reporting, authentication, or deployment behavior.

### Engineering Philosophy

#### Architecture First

Large or cross-cutting changes begin with requirements, investigation, architecture review, ADR validation, and design documentation before implementation starts.

#### Small Atomic Changes

Each implementation stage should be narrow enough to:

- understand quickly
- review independently
- verify deterministically
- roll back safely if needed

#### SOLID Principles

Use single-purpose modules, clear abstractions, dependency injection, and composable services. Avoid mixing concerns such as validation, persistence, orchestration, and transport logic.

#### Clean Architecture

Keep boundaries explicit:

- controllers handle transport concerns
- services handle business behavior
- repositories handle persistence access
- DTOs define public contracts
- mappers transform data
- validation stays isolated

#### Backward Compatibility

Protect existing APIs, scheduling behavior, deployment workflows, and persisted data unless an approved design explicitly changes them.

#### Incremental Delivery

Features are implemented in stages. Persistence, contracts, services, API, UI, and deployment verification should be separable whenever practical.

#### Testability

Every stage should remain easy to verify through builds, focused automated tests, Docker checks, and runtime health validation.

## 2. Development Lifecycle

All non-trivial PM Platform work should follow the canonical Stage model defined in [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md).

```text
Stage 0  Repository & Context Verification

Stage 1  Requirements Review

Stage 1.1 Documentation Alignment

Stage 2  Repository Investigation

Stage 3  Architecture & Design

Stage 3.5 ADR Review

Stage 4.1 Persistence

Stage 4.2 DTOs / Validation

Stage 4.5 Quality Gate

Stage 5  Application Service

Stage 6  API

Stage 7  Integration

Stage 8  Testing

Stage 9  Documentation

Stage 10 Final Review

Stage 11 Approval

Stage 12 Commit

Stage 13 Push
```

This playbook provides supporting guidance for these Stages. Where any lifecycle wording appears to differ, the Stage model in `ENGINEERING_MANUAL.md` is authoritative.

## 3. Definition of Done

The authoritative completion criteria for Stages, Features, Epics, and Releases are defined in [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md).

This playbook focuses on how to execute those Stages well:

- how to inspect the repository before acting
- how to verify monorepo builds and tests
- how to structure prompts and review checkpoints
- how to move safely from one approved Stage to the next

For authoritative pass/fail completion rules, use `DEFINITION_OF_DONE.md`.

### AI Architecture Validation

AI Platform work must include automated architecture validation when it touches
`backend/src/ai`.

Run the focused AI validation set from `backend/`:

```bash
npx eslint "src/ai/**/*.ts"
npm test -- --runTestsByPath src/ai/common/architecture/dependency-guardrails.spec.ts src/ai/common/registry/registry-conformance.spec.ts
```

The dependency guardrail test protects package direction, forbidden imports,
and package-level circular dependencies. The registry conformance test protects
shared registry behavior across Capability, Provider, Context, Prompt, Skill,
and MCP registries.

## 4. Git Workflow

Git is part of the engineering process, not an afterthought.

### Standard Commands

Review current state:

```bash
git status
git diff
git diff --stat
git diff --name-status
```

Stage intended files:

```bash
git add <file>
```

Create commit:

```bash
git commit -m "feat(scope): message"
```

Push branch:

```bash
git push
```

### Branch Strategy

- work on the requested feature branch
- keep one feature stream per branch
- do not mix unrelated work
- do not commit directly to unrelated branches

### Tagging Strategy

Use lightweight or annotated tags to mark stable feature baselines and verified releases when requested.

Examples:

- `v1.2.2-resource-crud`
- `v1.2.3-stage4.1-foundation`
- `v1.2.0`

Tags should represent meaningful verified states, not work-in-progress snapshots.

## 5. Commit Standards

Use Conventional Commits consistently.

### Common Commit Types

- `feat(...)`
  - use for user-facing or platform capability additions
- `fix(...)`
  - use for bug fixes or regression fixes
- `docs(...)`
  - use for documentation-only changes
- `refactor(...)`
  - use for internal restructuring without behavior change
- `test(...)`
  - use for test-only additions or adjustments
- `chore(...)`
  - use for maintenance work such as tooling or CI adjustments

### Examples

```text
feat(resources): add resource assignment validation service
fix(tasks): preserve milestone category during task update
docs(architecture): add ERM stage review baseline
refactor(calendar): extract holiday mapping helpers
test(resources): add assignment DTO validation coverage
chore(ci): tighten backend build workflow
```

### Usage Rules

- choose the narrowest accurate commit type
- scope should reflect the feature or subsystem
- commit messages should describe what changed, not the entire project context

## 6. Code Review Checklist

The authoritative review checklist is defined in [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md).

Use this playbook to determine when a review should occur in the Stage model.

Use `CODE_REVIEW_CHECKLIST.md` to determine what the review must examine.

## 7. Verification Checklist

Use this checklist after implementation stages.

- before suggesting npm commands, determine whether the repository is a monorepo or a single-package repository
- if multiple `package.json` files exist, never execute npm commands from the repository root unless a root `package.json` exists
- backend build passes
- frontend build passes where applicable
- affected tests pass
- migrations compile and run where applicable
- Docker build passes where applicable
- startup succeeds
- health endpoint is healthy
- repository diff is reviewed
- repository status is understood
- no unrelated files were changed

### Backend Verification

```bash
cd backend

npm install
npm run build
npm test
```

### Frontend Verification

```bash
cd ../frontend

npm install
npm run build
```

### Stage Verification Template

#### Backend Verification

```bash
cd backend

npm run build
npm test
```

#### Frontend Verification

```bash
cd ../frontend

npm run build
```

#### Docker Verification

```bash
cd ..

docker compose ps
docker compose logs backend --tail=50
```

## 8. Ubuntu Deployment Checklist

Typical Ubuntu deployment verification flow:

```bash
pwd
ls
find . -maxdepth 2 -name package.json
git status
git branch
```

Expected package discovery result:

```text
./backend/package.json
./frontend/package.json
```

Monorepo verification expectation:

- confirm the working directory is the repository root before running infrastructure commands
- confirm only `backend/package.json` and `frontend/package.json` exist at the expected depth
- run npm commands only from `backend/` or `frontend/`

Typical Ubuntu deployment verification flow:

```bash
git pull
docker compose build
docker compose up -d
docker compose ps
```

Additional checks:

- inspect backend logs
- inspect frontend logs
- verify health endpoint
- verify target feature behavior
- confirm migrations applied
- confirm container health

Suggested commands:

```bash
cd /opt/pm-platform

docker compose ps
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
```

Health and runtime checks:

```bash
docker compose exec backend wget -qO- http://127.0.0.1:3000/health
```

## 9. AI Development Rules

AI assistants working in PM Platform should follow these rules:

- never implement more than one stage at a time
- never mix architecture and implementation in the same stage
- never skip verification
- never refactor unrelated code opportunistically
- always keep changes small and reviewable
- always inspect the repository before making design assumptions
- always determine whether the repository is a monorepo or a single-package repository before suggesting npm commands
- if multiple `package.json` files exist, never execute npm commands from the repository root unless a root `package.json` exists
- always review `git status` and `git diff` before concluding work
- always stop at the requested stage
- never continue automatically into the next lifecycle stage
- never modify protected subsystems without explicit approval

## 10. Prompt Templates

The templates below are starting points for future work.

### Requirements Review Prompt

```text
Continue the PM Platform project.

Repository: PM Platform
Branch: <branch>
Current Stage: Stage 1 — Requirements Review

Objective:
Perform Stage 1 only for <feature>.

Read:
- BUILD_PLAYBOOK
- PM_PLATFORM_MASTER_GUIDE
- FEATURE_PROGRESS
- FEATURE_IMPLEMENTATION_PLAN
- Product Roadmap
- ADRs

Tasks:
- confirm feature scope
- identify dependencies
- identify protected modules
- identify likely ADR impact

Do not implement code.
Do not proceed beyond Stage 1.
```

### Architecture Review Prompt

```text
Continue the PM Platform project.

Repository: PM Platform
Branch: <branch>
Current Stage: Stage 3 — Architecture & Design

Objective:
Review whether the approved architecture for <feature> is complete and internally consistent.

Inputs:
- Requirements Review
- Repository Investigation
- Architecture Gap Analysis
- ADRs
- ADD

Do not implement code.
Do not redesign beyond identified gaps.
Stop after the review.
```

### Implementation Prompt

```text
Continue the PM Platform project.

Repository: PM Platform
Branch: <branch>
Current Stage: <implementation stage>

Objective:
Implement only <stage scope>.

Do not implement:
- <out of scope items>

After implementation:
- run backend verification from `backend/`
- run frontend verification from `frontend/` when applicable
- run Docker verification from the repository root when applicable
- review git status
- review git diff

Stop after this stage.
```

### Code Review Prompt

```text
Continue the PM Platform project.

Repository: PM Platform
Branch: <branch>
Current Stage: Stage 10 — Final Review

Objective:
Review the completed stage implementation for:
- architecture compliance
- SOLID
- dependency injection
- validation
- security
- backward compatibility

Do not modify code.
Do not run unrelated stages.
```

### Git Review Prompt

```text
Continue the PM Platform project.

Repository: PM Platform
Branch: <branch>

Objective:
Review repository readiness for commit.

Run:
- git status
- git diff --stat
- git diff --name-status

Confirm:
- only intended files changed
- no unrelated modifications exist
- commit scope is coherent
```

### Deployment Verification Prompt

```text
Continue the PM Platform project.

Repository: PM Platform
Branch: <branch>
Current Stage: Stage 8 — Testing

Objective:
Verify the feature in the deployment environment as part of the canonical Stage model.

Run:
- git pull
- docker compose build
- docker compose up -d
- docker compose ps
- docker compose logs backend --tail=50
- docker compose logs frontend --tail=50
- health checks
- log review

Stop after reporting deployment verification.
```

## 11. Lessons Learned

The PM Platform development process has reinforced the following lessons:

- architecture-first development is mandatory for stability
- repository synchronization should happen before feature work begins
- every stage should be reviewed explicitly
- small stage-scoped commits reduce risk
- one feature stage per commit keeps history clean
- assistants should never continue automatically into the next stage
- verification is part of implementation, not a separate afterthought
- documentation must stay aligned with actual repository state
- deployment verification matters because local build success is not enough

This playbook should be reused and refined as the standard delivery process for future PM Platform work.

---

## Related Governance Documents

- [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)
- [FEATURE_IMPLEMENTATION_TEMPLATE.md](FEATURE_IMPLEMENTATION_TEMPLATE.md)
- [QUALITY_GATES.md](QUALITY_GATES.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
