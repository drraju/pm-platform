# PM Platform Code Review Checklist

Engineering Governance Version: 1.0

Start here:
[ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)

Authoritative Scope:
Defines the authoritative review criteria, severity model, and outcomes used during every PM Platform code review.

This document defines the standard checklist used during every PM Platform code review.

It is intended for human contributors, reviewers, and AI coding assistants participating in implementation review, architecture review, and final approval workflows.

The canonical engineering Stage model is defined in [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md). This checklist should be applied within that Stage model rather than alongside a competing lifecycle definition.

---

## 1. Purpose

Code reviews exist to verify more than whether code compiles.

They are intended to verify:

- correctness
- architecture compliance
- maintainability
- security
- simplicity
- long-term scalability

The goal of code review is to improve the product, not merely to find defects.

Strong reviews protect the architecture, reduce future maintenance cost, and help the platform remain reliable as it grows.

## 2. Review Philosophy

PM Platform reviews should follow these principles:

- architecture before implementation
- simplicity over cleverness
- business logic belongs in services
- thin controllers
- Single Responsibility Principle
- Clean Architecture boundaries
- enterprise-grade maintainability
- AI assists reviewers but does not replace engineering judgement

Reviews should challenge unnecessary complexity, question weak boundaries, and reinforce long-term platform health.

## 3. Review Categories

### Requirements Review

Verify:

- [ ] requirements implemented
- [ ] acceptance criteria satisfied
- [ ] scope unchanged

### Architecture Review

Verify:

- [ ] Clean Architecture maintained
- [ ] domain boundaries preserved
- [ ] no circular dependencies
- [ ] no unnecessary abstractions
- [ ] ADRs respected

### Domain Model Review

Verify:

- [ ] entities correctly model business concepts
- [ ] naming consistent
- [ ] relationships appropriate
- [ ] aggregates preserved

### API Review

Verify:

- [ ] REST conventions followed
- [ ] DTOs remain in the transport layer
- [ ] validation complete
- [ ] error responses consistent
- [ ] authorization enforced

### Persistence Review

Verify:

- [ ] repository responsibilities preserved
- [ ] transactions correctly scoped
- [ ] migrations additive
- [ ] indexes appropriate
- [ ] no unnecessary queries

### Application Service Review

Verify:

- [ ] business logic centralized
- [ ] no transport-layer coupling
- [ ] validation delegated appropriately
- [ ] services remain cohesive

### Testing Review

Verify:

- [ ] unit tests added
- [ ] integration tests added when required
- [ ] existing tests unaffected
- [ ] build successful

### Documentation Review

Verify:

- [ ] Feature Progress updated
- [ ] ADR updated if required
- [ ] product documentation updated
- [ ] process documentation updated if applicable

### Security Review

Verify:

- [ ] authorization implemented
- [ ] sensitive data protected
- [ ] input validation complete
- [ ] no privilege escalation

### Performance Review

Verify:

- [ ] efficient queries
- [ ] no unnecessary allocations
- [ ] no N+1 patterns
- [ ] appropriate indexing

### AI Readiness Review

Verify:

- [ ] feature remains observable
- [ ] domain terminology consistent
- [ ] future automation not blocked
- [ ] AI integration points preserved

## 4. Review Outcomes

Code reviews must end with a clear outcome.

### Approved

No issues.

### Approved with Minor Recommendations

No blocking issues.

### Changes Required

One or more blocking issues.

### Rejected

Architecture or design violates project principles.

## 5. Severity Levels

Review findings must be classified consistently.

### Critical

Must be fixed before approval.

Examples:

- architecture boundary violation in a protected subsystem
- security flaw
- destructive data behavior
- release-blocking defect

### Major

Serious issue that blocks approval until corrected.

Examples:

- business logic in controllers
- transport DTO leakage into the application layer
- missing required transaction boundaries
- incomplete validation for a required scenario

### Minor

Non-blocking issue that should normally be corrected before final completion.

Examples:

- naming inconsistency
- incomplete test coverage for a narrow edge case
- documentation drift
- small maintainability concern

### Suggestion

Improvement idea that does not block approval.

Examples:

- readability improvement
- small simplification
- optional refactor for a future stage
- additional clarification in docs or comments

## 6. Review Summary Template

Use the following reusable template when recording a review:

```markdown
## Review Summary

Architecture

Requirements

Testing

Documentation

Issues

Severity

Decision

Next Steps
```

## 7. Review Principles

Use the following reminders during every review:

- challenge complexity
- prefer simpler solutions
- protect architecture over convenience
- keep the platform easy to use
- every feature should reduce user effort

Good reviews improve both the code and the product direction. They should make the platform easier to maintain, safer to extend, and better for end users.

---

## Related Governance Documents

- [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)
- [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md)
- [QUALITY_GATES.md](QUALITY_GATES.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
