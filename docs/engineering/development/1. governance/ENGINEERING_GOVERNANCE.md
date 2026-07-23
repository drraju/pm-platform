# PM Platform Engineering Governance v1.1 Addendum

Engineering Governance Version: 1.1 Addendum

Start here:
[ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)

Authoritative Scope:
Defines additive governance guidance learned from Feature 1.2.3 without modifying the frozen Engineering Governance v1.0 baseline.

This document is the official governance addendum for PM Platform after completion of Feature 1.2.3 Resource Assignment.

It captures implementation, review, migration, testing, release-readiness, and documentation lessons that should guide every future feature.

This addendum is required reading before future feature work begins.

---

## 1. Purpose

This addendum preserves the lessons learned from Feature 1.2.3 so they become repeatable engineering practice rather than one-time recovery work.

Its purpose is to improve:

- migration safety
- architecture review quality
- release-readiness discipline
- documentation consistency
- repository source-of-truth behavior
- AI-assisted development reliability

## 2. Scope

This document is additive only.

It does not replace or revise Engineering Governance v1.0.

It applies to:

- future ERM features
- future persistence features
- release-readiness reviews
- architecture remediation work
- final documentation synchronization

If this addendum conflicts with Governance v1.0, Governance v1.0 remains authoritative unless a future ADR explicitly changes that rule.

## 3. Lessons Learned from Feature 1.2.3

Feature 1.2.3 demonstrated that implementation completeness is not sufficient by itself.

The repository required multiple review and remediation cycles because:

- business rules were initially enforced in application validation but not yet at the database layer
- fresh-install behavior and upgraded-database behavior diverged
- feature naming and status drifted across planning documents
- merge readiness depended on final documentation synchronization, not only passing tests

The core lesson is simple:

- architecture approval must be followed by invariant enforcement
- invariant enforcement must be verified for both new and upgraded environments
- documentation must converge before merge approval

## 4. Migration Governance

### Applied migrations are immutable

Once a migration has been applied in a shared or upgraded environment, it must be treated as immutable.

Do not retrofit new schema behavior into an already-applied migration as the primary rollout strategy.

### Upgrade-safe migration strategy

If a new invariant or index is discovered after a migration has already been applied, create a new sequential migration.

This applies especially to:

- indexes
- constraints
- data repair
- safety guards
- backfill logic

### Fresh install vs upgraded database verification

Persistence changes must be verified in both modes:

- fresh database bootstrap
- upgraded database with prior migrations already applied

A feature is not migration-safe until both paths are proven.

## 5. Architecture Review Improvements

### Architecture-first refinement

Architecture review must explicitly test whether the implementation preserves:

- approved aggregate ownership
- dependency direction
- bounded context isolation
- repository conventions
- database invariants

### Review quality expectations

Architecture review should not stop at controller/service structure.

It must also inspect:

- persistence enforcement
- upgrade behavior
- permission alignment
- planning/documentation consistency

### Business rule documentation

If a business rule is important enough to validate in code, it must also be written explicitly in repository documentation.

Business rules must not remain implicit in:

- validation logic
- tests
- migration names
- reviewer memory

## 6. Release Readiness Checklist

Before final feature approval, verify:

- builds pass
- automated tests pass
- architecture reviews are resolved
- documentation is synchronized
- upgraded-database migration path is safe
- release-readiness fixes are committed
- working tree is clean

Release readiness is a distinct governance step, not an informal wrap-up.

## 7. Documentation Synchronization Rules

When a feature reaches completion, all planning documents must be synchronized before final merge approval.

At minimum review:

- `docs/FEATURE_PROGRESS.md`
- `docs/product/PRODUCT_BACKLOG.md`
- `docs/product/RELEASE_PLAN.md`
- relevant epic documentation
- relevant implementation plan or architecture traceability documents

Feature name, status, and sequencing must match across those documents.

## 8. Repository Source of Truth Rules

The repository is the source of truth.

Chat history, external notes, or prior review comments do not override repository documentation once repository updates are approved and committed.

Before implementation or review:

- read the current repository documents
- confirm feature naming
- confirm lifecycle stage
- confirm baseline commit or approved architecture references

Do not rely on historical memory when the repository has moved on.

## 9. Database Invariant Rules

Important business invariants must be enforced at the database layer where feasible.

Application validation remains valuable, but it is not the authoritative final guard for:

- uniqueness rules
- referential safety
- lifecycle consistency
- required-state combinations

Preferred policy:

- application validation provides user-friendly feedback
- database constraints provide authoritative enforcement

## 10. Testing Improvements

Features that introduce persistence invariants must include tests that prove:

- application-layer validation behavior
- database-layer enforcement behavior
- fresh-install migration safety
- upgraded-database migration safety

In-memory tests are not sufficient for database invariants by themselves.

Add PostgreSQL-backed verification when the feature depends on PostgreSQL behavior such as:

- partial indexes
- constraints
- SQL migration ordering
- upgrade safety

## 11. Merge Readiness Checklist

Before recommending merge, verify:

- feature code and tests are complete
- release-readiness remediations are complete
- planning documents agree on feature status
- no unrelated files remain in the diff
- repository is clean
- remote branch state is confirmed where available

If CI cannot be verified from the current environment, classify that explicitly as an environmental limitation rather than an implementation failure.

## 12. Definition of Done Enhancements

Feature completion should now be interpreted to include the following practical additions:

- business rules are explicitly documented
- important invariants are enforced in persistence as well as validation
- upgraded-database behavior is verified
- planning documents are synchronized
- final merge review includes repository consistency checks

Code that works is not enough.

A feature is done only when implementation, persistence, review, and documentation all agree.

## 13. AI Development Guidance

AI assistants working on PM Platform should apply the following lessons by default:

- do not assume an edited migration can safely represent upgraded-database behavior
- verify whether a rule is documented, not only implemented
- check fresh-install and upgraded-database paths separately
- treat documentation synchronization as required work, not optional cleanup
- distinguish clearly between implementation failure and environment limitation
- stop when governance or release-readiness steps are complete rather than continuing automatically

AI should prefer explicit repository evidence over inferred intent.

## 14. Future Governance Recommendations

Future governance evolution should consider:

- a formal migration governance document
- a dedicated release-readiness checklist document
- explicit upgraded-environment verification guidance in quality gates
- repository consistency checks in final review templates
- stronger cross-linking between feature progress, backlog, release plan, and epic documents

Until those changes are formally adopted, this addendum supplies the required guidance.

---

## Related Governance Documents

- [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)
- [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md)
- [QUALITY_GATES.md](QUALITY_GATES.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md)

# PM Platform Engineering Governance v1.3 Addendum

Engineering Governance Addendum Version: 1.3

Status: Approved

Builds on:
[ENGINEERING_GOVERNANCE_v1.2_ADDENDUM.md](ENGINEERING_GOVERNANCE_v1.2_ADDENDUM.md)

Authoritative Scope:
Defines additive release-readiness and static-analysis governance learned from Features 1.2.5 and 1.2.6. It does not modify or supersede Engineering Governance v1.0 or the approved v1.1 and v1.2 Addenda.

This addendum distinguishes feature quality from repository baseline technical debt while preserving strict no-new-debt requirements for every feature.

---

## 1. Executive Summary

Features 1.2.5 and 1.2.6 completed implementation, architecture review, infrastructure validation, regression testing, feature-scoped ESLint, and feature-scoped Prettier verification. Both nevertheless reached Stage 12 with release blockers caused solely by pre-existing repository-wide lint and formatting violations in unrelated modules.

Repository baseline debt must remain visible and actively managed, but it must not be misclassified as a defect in an otherwise compliant feature. This addendum establishes feature-scoped static analysis as the mandatory release boundary until repository-wide cleanup is explicitly declared complete.

This addendum introduces five Governance Improvements:

- GI-009: Feature-Scoped Static Analysis
- GI-010: Repository Technical Debt
- GI-011: No New Technical Debt
- GI-012: Release Gate Clarification
- GI-013: Review Reporting

These improvements are additive only. They preserve all existing build, regression, persistence, infrastructure, documentation, and repository-verification expectations.

## 2. Governance Additions

| Improvement | Authority                   | Outcome                                                                        |
| ----------- | --------------------------- | ------------------------------------------------------------------------------ |
| GI-009      | Static-analysis scope       | Makes feature-scoped ESLint and Prettier mandatory Stage 12 gates.             |
| GI-010      | Baseline debt management    | Routes unrelated legacy violations into explicit technical-debt work.          |
| GI-011      | No-new-debt policy          | Requires every modified feature file to introduce zero new quality violations. |
| GI-012      | Release gate classification | Separates mandatory feature gates from informational repository-wide health.   |
| GI-013      | Review reporting            | Requires distinct Feature Readiness and Repository Baseline Health decisions.  |

### 2.1 GI-009: Feature-Scoped Static Analysis

Stage 12 SHALL require:

- repository build
- repository regression tests
- feature-scoped ESLint
- feature-scoped Prettier verification
- `git diff --check`
- confirmation that modified feature files contain no new `TODO`, `FIXME`, or `HACK` comments

Repository-wide lint and formatting remain recommended health checks. They are not feature release blockers unless:

- modified feature files introduce new violations; or
- approved governance explicitly declares repository-wide cleanup complete and establishes repository-wide static analysis as a mandatory gate.

Feature scope includes every implementation, test, migration-adjacent source, configuration, or documentation file changed for the approved feature. Reviewers must derive the scope from repository evidence rather than an assumed directory list.

### 2.2 GI-010: Repository Technical Debt

Existing unrelated repository-wide lint and formatting debt SHALL be managed through:

- dedicated backlog items
- explicit engineering initiatives
- scheduled cleanup work
- measurable baseline reporting

A feature release SHALL NOT be blocked solely because of pre-existing violations outside its approved implementation scope.

Repository debt must not be hidden or ignored. Stage 12 must report it as Repository Baseline Debt, identify the affected areas at an appropriate level, and reference the responsible backlog or engineering initiative when one exists.

### 2.3 GI-011: No New Technical Debt

Every feature must produce, within its modified files:

- zero new ESLint errors
- zero new Prettier violations
- zero formatting regressions
- zero new `TODO`, `FIXME`, or `HACK` comments

If a modified file already contains a baseline violation, the feature must not increase the violation count or expand the violation surface. Any exception requires explicit governance approval and a documented remediation owner; ordinary Stage 12 review cannot waive this rule.

The no-new-debt requirement applies regardless of repository-wide baseline health.

### 2.4 GI-012: Release Gate Clarification

Stage 12 mandatory gates are:

- repository build
- complete repository regression suite
- feature-scoped tests
- persistence verification when persistence is in scope
- infrastructure verification
- documentation synchronization
- feature-scoped ESLint
- feature-scoped Prettier verification
- `git diff --check`
- no-new-debt verification under GI-011

Stage 12 informational health checks are:

- repository-wide lint status
- repository-wide formatting status

Informational failures must be reported and classified as Repository Baseline Debt. They become blocking only under the conditions defined by GI-009 or when they reveal a failure in another mandatory gate.

### 2.5 GI-013: Review Reporting

Every future Stage 12 review SHALL contain separate conclusions for:

```text
Feature Ready: YES | NO
Repository Baseline Healthy: YES | NO
```

The review must explain each `NO` independently. Repository baseline debt must never be classified as a feature implementation defect.

The final release decision follows Feature Readiness and the mandatory gates in GI-012. Repository Baseline Health remains visible for engineering governance and prioritization without automatically changing the feature decision.

## 3. Engineering Rationale

This policy supports incremental modernization. Large repositories accumulate quality debt over time, and requiring an unrelated feature to repair all historic violations creates unpredictable scope, increases change risk, and discourages focused delivery.

Feature-scoped enforcement maintains strict quality for every newly developed or modified file. It prevents new violations while allowing repository cleanup to proceed through deliberate, reviewable engineering work.

Separating feature readiness from repository baseline health:

- prevents unrelated legacy code from blocking completed features
- aligns release decisions with approved implementation scope
- preserves strict build, regression, persistence, infrastructure, and documentation gates
- prevents feature work from concealing new lint or formatting debt
- keeps repository-wide debt visible and measurable
- enables cleanup to be planned, owned, tested, and released safely

This is not a reduction in engineering quality. It is a scope-accurate enforcement model paired with an explicit no-new-debt rule and continued repository health reporting.

## 4. Stage 12 Policy

Stage 12 reviewers must perform the following sequence:

1. Identify the approved feature file set from `git status`, `git diff --stat`, `git diff --name-status`, and feature records.
2. Run repository builds and the complete regression suite.
3. Run feature-scoped tests and required persistence verification.
4. Confirm infrastructure and documentation readiness.
5. Run ESLint and Prettier against every modified feature file.
6. Run `git diff --check` and scan modified feature files for `TODO`, `FIXME`, and `HACK` markers.
7. Run or inspect repository-wide lint and formatting health as informational evidence.
8. Separate new feature violations from pre-existing unrelated baseline debt.
9. Report Feature Readiness and Repository Baseline Health independently.

A feature is release-ready when all mandatory gates pass and no unresolved feature-scoped blocker remains. Repository baseline debt alone does not change that decision.

## 5. Feature vs Repository Decision Matrix

| Feature-scoped gates                                    | Repository-wide baseline                                                                       | Classification                                       | Feature release decision         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------- |
| Pass                                                    | Pass                                                                                           | Feature compliant; repository healthy                | Approve                          |
| Pass                                                    | Fail only in unrelated, pre-existing files                                                     | Feature compliant; Repository Baseline Debt exists   | Approve and report baseline debt |
| Fail                                                    | Pass                                                                                           | Feature quality defect                               | Block                            |
| Fail                                                    | Fail                                                                                           | Feature quality defect plus repository baseline debt | Block and report both separately |
| Pass, but modified files add repository-wide violations | Any                                                                                            | New feature technical debt under GI-011              | Block                            |
| Pass                                                    | Repository-wide cleanup has been formally declared complete, but the repository gate regresses | Repository governance regression                     | Block                            |

Classification rules:

- A violation is feature-scoped when it occurs in a file modified for the approved feature.
- A violation is baseline debt when it existed outside the feature scope before the feature review.
- Unclear ownership must be investigated before approval; reviewers must not assume that a failing path is unrelated.
- Baseline debt discovered during review must be reported even when the feature is approved.

## 6. Future Cross References

No existing cross-reference is modified by this addendum. A separate approved governance task should add references from:

- `ENGINEERING_MANUAL.md`
- `QUALITY_GATES.md`
- `DEFINITION_OF_DONE.md`
- `FEATURE_IMPLEMENTATION_TEMPLATE.md`

Those future updates should reference GI-009 through GI-013 rather than duplicate their rules.

## 7. Risks

| Risk                                         | Mitigation                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Baseline debt becomes permanently tolerated  | Track debt through owned backlog items, initiatives, scheduled cleanup, and baseline reporting.           |
| Feature scope is defined too narrowly        | Derive scope from repository evidence and include every file modified for the feature.                    |
| New violations are mislabeled as legacy debt | Compare modified files and, where necessary, the pre-feature baseline before classifying findings.        |
| Repository-wide regressions go unnoticed     | Continue informational repository-wide lint and formatting checks at Stage 12.                            |
| Cleanup work produces broad regression risk  | Deliver cleanup through dedicated, tested engineering initiatives rather than incidental feature changes. |
| Review conclusions become ambiguous          | Require the two explicit GI-013 readiness statements and separate rationales.                             |

## 8. Repository Review

This governance task creates only:

- `docs/development/ENGINEERING_GOVERNANCE_v1.3_ADDENDUM.md`

It does not modify Engineering Governance v1.0, the v1.1 or v1.2 Addenda, implementation, tests, migrations, ADRs, product documents, completed feature records, or runtime behavior.

Repository verification for this task must include:

```bash
git status --short --branch
git diff --stat
git diff --name-status
git diff --check
```

Pre-existing worktree changes must be preserved and classified separately from this addendum.

---

## Related Governance Documents

- [ENGINEERING_GOVERNANCE_v1.2_ADDENDUM.md](ENGINEERING_GOVERNANCE_v1.2_ADDENDUM.md)

