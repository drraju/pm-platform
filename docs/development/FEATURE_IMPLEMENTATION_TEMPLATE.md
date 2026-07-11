# PM Platform Feature Implementation Template

Engineering Governance Version: 1.0

Start here:
[ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)

Authoritative Scope:
Defines the authoritative feature lifecycle template used to plan and execute PM Platform features through the canonical Stage model.

Use this template for every future PM Platform feature. Copy it into the appropriate planning or architecture location and complete each section before implementation begins.

The authoritative engineering Stage model is defined in [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md). This template should align to that Stage model rather than redefining a competing lifecycle.

---

# Feature Name

## Objective

- [ ] State the feature objective clearly.
- [ ] State the business or architectural purpose.
- [ ] State the expected outcome.

## Requirements

### In Scope

- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

### Out of Scope

- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

### Constraints

- [ ] Protected modules identified
- [ ] Backward compatibility expectations identified
- [ ] Deployment expectations identified
- [ ] Security or permission expectations identified

## Dependencies

### Repository Dependencies

- [ ] Existing module dependencies identified
- [ ] Existing entities identified
- [ ] Existing API/UI dependencies identified

### Feature Dependencies

- [ ] Prior feature dependencies documented
- [ ] Future feature dependencies documented

### Architecture Dependencies

- [ ] ADR dependencies identified
- [ ] ADD dependencies identified
- [ ] Integration boundaries identified

## Repository Investigation

### Backend

- [ ] Existing modules reviewed
- [ ] Existing DTOs reviewed
- [ ] Existing services reviewed
- [ ] Existing entities reviewed
- [ ] Existing validation patterns reviewed
- [ ] Existing tests reviewed

### Frontend

- [ ] Existing routes reviewed
- [ ] Existing feature folders reviewed
- [ ] Existing shared components reviewed
- [ ] Existing API client usage reviewed
- [ ] Existing test patterns reviewed

### Database

- [ ] Existing tables reviewed
- [ ] Existing migrations reviewed
- [ ] Existing indexes reviewed
- [ ] Existing audit / soft delete patterns reviewed

### Reusable Assets

- [ ] Reusable backend components identified
- [ ] Reusable frontend components identified
- [ ] Reusable testing patterns identified

## Architecture

### Architectural Summary

- [ ] Bounded context identified
- [ ] Ownership boundaries documented
- [ ] Protected architecture documented
- [ ] Integration points documented

### Risks

- [ ] Risk 1 documented
- [ ] Risk 2 documented
- [ ] Risk 3 documented

### Non-Negotiable Boundaries

- [ ] Scheduling isolation preserved
- [ ] Calendar ownership preserved
- [ ] Planning ownership preserved
- [ ] Resource ownership preserved where applicable
- [ ] Deployment compatibility preserved

## ADR

### Existing ADR Coverage

- [ ] Existing ADRs reviewed
- [ ] Coverage sufficiency documented

### New ADR Requirement

- [ ] No new ADR required
- [ ] or new ADR required and documented

## Implementation Stages

### Stage 0 — Repository & Context Verification

- [ ] verify branch
- [ ] verify working tree
- [ ] verify documentation baseline

### Stage 1 — Requirements Review

- [ ] requirements reviewed
- [ ] scope approved

### Stage 1.1 — Documentation Alignment

- [ ] naming aligned
- [ ] architecture references aligned
- [ ] scope wording aligned across documentation

### Stage 2 — Repository Investigation

- [ ] investigation completed
- [ ] reusable patterns documented

### Stage 3 — Architecture & Design

- [ ] gap analysis completed
- [ ] ADD completed

### Stage 3.5 — ADR Review

- [ ] ADR review completed
- [ ] required ADRs approved

### Stage 4.1 — Persistence

- [ ] migrations
- [ ] entities
- [ ] enums
- [ ] registration

### Stage 4.2 — DTOs / Validation

- [ ] request DTOs
- [ ] response DTOs
- [ ] mapper
- [ ] validation service

### Stage 4.5 — Quality Gate

- [ ] architecture gate passed
- [ ] scope gate passed
- [ ] implementation approved to continue

### Stage 5 — Application Service

- [ ] domain service updates
- [ ] orchestration service updates

### Stage 6 — API

- [ ] controllers
- [ ] route guards
- [ ] Swagger

### Stage 7 — Integration

- [ ] runtime integration checks completed
- [ ] deployment-facing integration checks completed where applicable

### Stage 8 — Testing

- [ ] builds
- [ ] tests
- [ ] runtime validation

### Stage 9 — Documentation

- [ ] architecture docs updated
- [ ] process docs updated where applicable
- [ ] feature status docs updated

### Stage 10 — Final Review

- [ ] architecture review
- [ ] implementation review

### Stage 11 — Approval

- [ ] all gates passed
- [ ] repository state understood
- [ ] feature approved

### Stage 12 — Commit

- [ ] diff reviewed
- [ ] commit message prepared
- [ ] commit created

### Stage 13 — Push

- [ ] branch pushed
- [ ] remote verified

### Optional UI Scope

- [ ] API client integration
- [ ] pages/routes
- [ ] feature hooks
- [ ] components/dialogs/forms

## Verification Gates

### Build

- [ ] backend build passes
- [ ] frontend build passes where applicable

### Tests

- [ ] affected backend tests pass
- [ ] affected frontend tests pass

### Runtime

- [ ] application starts
- [ ] migration succeeds where applicable
- [ ] health endpoint succeeds

### Repository Review

- [ ] `git status` reviewed
- [ ] `git diff --stat` reviewed
- [ ] `git diff --name-status` reviewed

## Review

Use [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md) as the authoritative review standard. The checklist below is a feature-planning convenience summary only.

### Architecture Review Checklist

- [ ] ADD followed
- [ ] ADRs followed
- [ ] boundaries preserved

### Code Review Checklist

- [ ] SOLID
- [ ] naming
- [ ] dependency injection
- [ ] validation isolation
- [ ] security
- [ ] performance
- [ ] backward compatibility

## Commit

### Commit Plan

- [ ] commit scope is coherent
- [ ] conventional commit type selected
- [ ] only intended files staged

### Commit Message

```text
<type>(<scope>): <message>
```

Example:

```text
feat(resources): add resource assignment validation stage
```

## Push

- [ ] push completed
- [ ] branch synchronized

## Deployment Verification Guidance

This deployment verification guidance supports the canonical Stage model defined in [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md). It is typically executed as part of Stage 7 Integration or Stage 8 Testing when the feature scope requires deployment validation.

### Suggested Commands

```bash
git pull
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
```

### Deployment Checks

- [ ] backend healthy
- [ ] frontend healthy
- [ ] postgres healthy
- [ ] redis healthy
- [ ] minio healthy
- [ ] target feature verified

## Definition of Done

Use [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md) as the authoritative completion standard. The checklist below is a feature-planning convenience summary aligned to that document.

- [ ] requirements approved
- [ ] repository investigation completed
- [ ] architecture approved
- [ ] ADR coverage complete
- [ ] implementation completed by stage
- [ ] build passed
- [ ] tests passed
- [ ] Docker verification passed where applicable
- [ ] deployment verification passed where applicable
- [ ] documentation updated
- [ ] repository ready for final sign-off

## Lessons Learned

- [ ] record architecture lesson
- [ ] record implementation lesson
- [ ] record verification lesson
- [ ] record deployment lesson

## Notes

- [ ] additional feature-specific notes
- [ ] review findings
- [ ] follow-up items

---

## Related Governance Documents

- [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)
- [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md)
- [QUALITY_GATES.md](QUALITY_GATES.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md)
- [CODING_STANDARDS.md](CODING_STANDARDS.md)
