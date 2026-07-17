# PM Platform Definition of Done

Engineering Governance Version: 1.0

Start here:
[ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)

Authoritative Scope:
Defines the authoritative completion criteria for PM Platform Stages, Features, Epics, and Releases.

This document defines the authoritative Definition of Done for PM Platform stages, features, epics, and releases.

It is intended for human contributors, reviewers, and AI coding assistants working within the Architecture-First Development Process.

The canonical engineering Stage model is defined in [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md). This document defines completion criteria for that Stage model.

---

## 1. Purpose

Definition of Done prevents ambiguity.

A feature is not complete because code exists.

It is complete only after all engineering, documentation, testing, architecture, and governance requirements have been satisfied.

The purpose of this document is to make completion criteria explicit so PM Platform delivery remains consistent, reviewable, and dependable.

## 2. Definition of Done Philosophy

PM Platform completion standards are guided by the following principles:

- architecture before implementation
- small incremental changes
- enterprise quality
- reproducible releases
- documentation is part of the product
- AI assists engineering rather than replacing engineering judgement

Definition of Done exists to reinforce disciplined delivery. It ensures that implementation, review, verification, and documentation are treated as part of the same engineering outcome.

## 3. Stage Definition of Done

Every implementation stage is complete only when:

- [ ] objectives achieved
- [ ] architecture preserved
- [ ] repository builds successfully
- [ ] tests pass
- [ ] new code is lint clean
- [ ] documentation updated when applicable
- [ ] review completed
- [ ] stage approved

If any required item remains incomplete, the stage is not done.

## 4. Feature Definition of Done

A feature is complete only when:

- [ ] all implementation stages approved
- [ ] build successful
- [ ] unit tests passing
- [ ] integration tests passing
- [ ] API documentation updated
- [ ] architecture documentation updated
- [ ] feature tracker updated
- [ ] git repository clean
- [ ] feature committed
- [ ] feature pushed
- [ ] final architecture review approved

Feature completion requires more than implementation. It requires successful verification, documentation alignment, repository readiness, and review approval.

## 5. Epic Definition of Done

An Epic is complete only when:

- [ ] every feature completed
- [ ] no open architecture issues
- [ ] documentation complete
- [ ] regression tests passed
- [ ] release notes prepared
- [ ] product backlog updated

Epic completion means the full planned capability has been delivered with acceptable engineering quality and clear release traceability.

## 6. Release Definition of Done

A Release is complete only when:

- [ ] all planned Epics complete
- [ ] no Critical defects
- [ ] database migrations verified
- [ ] Docker verification complete
- [ ] deployment verification complete
- [ ] rollback strategy documented
- [ ] version tagged
- [ ] release documentation updated

Release completion requires confidence that the platform can be deployed, validated, supported, and rolled back if necessary.

## 7. Repository Readiness Checklist

Repository readiness must be verified using the PM Platform monorepo structure.

### Backend

```bash
cd backend

npm run build

npm test
```

### Frontend

```bash
cd ../frontend

npm run build
```

### Docker

```bash
docker compose ps
```

### Repository

```bash
git status

git branch
```

## 8. Architecture Completion Checklist

Before declaring work complete, verify:

- [ ] Clean Architecture maintained
- [ ] no circular dependencies
- [ ] domain boundaries preserved
- [ ] services own business logic
- [ ] controllers remain thin
- [ ] persistence isolated
- [ ] transactions correctly defined
- [ ] DTOs confined to the transport layer
- [ ] validation complete
- [ ] error handling complete
- [ ] public response DTOs and mapper boundaries verified
- [ ] OpenAPI paths and schemas verified for API changes
- [ ] list pagination, sorting, filtering, and stable ordering verified where applicable

This checklist is mandatory even when the build and tests pass. Architectural correctness remains a separate completion requirement.

## 9. Documentation Completion Checklist

Before declaring work complete, verify:

- [ ] Feature Progress updated
- [ ] ADR updated if required
- [ ] Product Backlog updated if required
- [ ] architecture documents updated
- [ ] playbook updated if the process changed

Documentation completion ensures the repository remains the authoritative source of truth for implementation status and engineering process.

## 10. Future Enhancements

This section reserves space for future Definition of Done expansions as the PM Platform governance model matures.

Future areas may include:

- security review
- performance review
- observability review
- AI readiness review
- scalability review
- accessibility review

These items remain reserved until the repository establishes formal policies, tooling, and approval workflows for them.

---

## Related Governance Documents

- [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)
- [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md)
- [QUALITY_GATES.md](QUALITY_GATES.md)
- [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
