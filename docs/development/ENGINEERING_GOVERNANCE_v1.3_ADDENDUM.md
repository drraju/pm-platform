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
