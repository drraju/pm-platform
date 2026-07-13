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
