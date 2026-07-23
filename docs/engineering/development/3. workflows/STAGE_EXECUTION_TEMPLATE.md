# PM Platform Stage Execution Template

Engineering Governance Version: 1.0

Start here:
[ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)

Authoritative Scope:
Defines the canonical template used to plan, execute, review, and verify a single PM Platform engineering Stage.

This document is the standard template for every future implementation Stage in PM Platform.

Use it to prepare Stage-specific prompts, review criteria, verification steps, and completion artifacts without redefining the engineering lifecycle for each feature.

The authoritative Stage model is defined in [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md). This template applies that model to one Stage at a time.

---

# Stage Execution Template

## Current Project Status

### Repository Status

- Project:
- Branch:
- Working tree:
- Latest approved architecture baseline:
- Backend status:
- Frontend status:
- Documentation status:
- Governance version:

### Current Capability

- What is implemented today:
- What is verified:
- What remains incomplete:

## Source of Truth

Review and follow the repository documents that govern this Stage.

- [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)
- [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md)
- [FEATURE_IMPLEMENTATION_TEMPLATE.md](FEATURE_IMPLEMENTATION_TEMPLATE.md)
- [QUALITY_GATES.md](QUALITY_GATES.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- Feature-specific ADRs
- Feature-specific ADD
- Feature progress tracker
- Product roadmap and backlog documents where applicable

If any Stage instructions appear to conflict, use the governance precedence defined in `ENGINEERING_MANUAL.md`.

## Stage Summary

### Stage

- Active Stage:
- Stage name:

### Objective

- What this Stage must achieve:
- What this Stage must not do:

### Definition of Success

This Stage is successful only when:

- [ ] the Stage objective is fully achieved
- [ ] architecture remains compliant
- [ ] protected components remain unchanged
- [ ] required build and test checks pass
- [ ] expected Stage artifacts are complete
- [ ] required documentation is updated when in scope
- [ ] the Stage is ready for formal review

## Stage Context

### Stage -1 — Product Thinking

- Problem being solved:
- User outcome:
- Business value:
- Key constraints:
- Dependencies:
- Success signal:

### Current Stage

- Entry criteria met:
- Exit criteria:
- Approved scope:
- Explicit out-of-scope items:

## Architecture Considerations

- Architectural invariants:
- Existing modules affected:
- Protected components:
- Dependency boundaries:
- Transport boundary rules:
- Persistence rules:
- Security or authorization rules:
- Relevant ADRs / ADDs:

The following architecture shape should remain explicit where applicable:

```text
HTTP Request
      ↓
Controller
      ↓
DTO
      ↓
Mapper
      ↓
Application Command / Input Model
      ↓
Application Service
      ↓
Repository
```

## Risk Assessment

### Technical Risks

- Risk:
  - Impact:
  - Mitigation:
- Risk:
  - Impact:
  - Mitigation:

### Product Risks

- Risk:
  - Impact:
  - Mitigation:
- Risk:
  - Impact:
  - Mitigation:

### Operational Risks

- Risk:
  - Impact:
  - Mitigation:
- Risk:
  - Impact:
  - Mitigation:

## Recommended Approach

1. Review the Source of Truth before making changes.
2. Confirm repository baseline, branch, and working tree status.
3. Implement only the approved Stage scope.
4. Preserve architectural invariants and protected modules.
5. Reuse existing repository patterns instead of inventing parallel structures.
6. Verify the Stage with the required build, test, and repository checks.
7. Stop for review before proceeding to the next Stage.

## Stage Artifacts

List the outputs expected from this Stage.

- Files created:
- Files modified:
- Tests added or updated:
- Migrations added:
- Documentation updates:
- Review notes:
- Verification results:

If a Stage is documentation-only or review-only, state that explicitly and list the expected non-code artifacts instead.

## Implementation Prompt

Use this section to define the exact execution prompt for the Stage.

Include:

- repository and branch
- current approved Stage
- scope
- explicit out-of-scope items
- architectural invariants
- required files or modules
- required verification steps
- required deliverables
- stop condition

## Review Prompt

Use this section to define the exact review prompt for the Stage.

Include:

- architecture compliance checks
- scope compliance checks
- code quality expectations
- protected component verification
- test and build expectations
- documentation expectations
- review outcome wording

## Verification Commands

Run only the commands appropriate to the Stage scope.

### Backend Verification

```bash
cd backend
npm run build
npm test
```

### Frontend Verification

```bash
cd ../frontend
npm run build
```

### Repository Verification

```bash
git status
git diff --stat
git diff --name-status
```

### Docker Verification

```bash
cd ..
docker compose ps
docker compose logs backend --tail=50
docker compose logs frontend --tail=50
```

### Ubuntu Verification

```bash
pwd
ls
find . -maxdepth 2 -name package.json
git status
git branch
docker compose ps
```

Expected package layout:

```text
backend/package.json
frontend/package.json
```

## Commit Message

Use Conventional Commits.

```text
<type>(<scope>): <summary>
```

Examples:

```text
feat(resources): add resource assignment api
docs(governance): add stage execution template
test(resources): add assignment integration coverage
```

## Next Stage Recommendation

- Recommended next Stage:
- Why this is the correct next Stage:
- Preconditions:
- Approval required from:
- Do not proceed until:

---

## Related Governance Documents

- [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)
- [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md)
- [FEATURE_IMPLEMENTATION_TEMPLATE.md](FEATURE_IMPLEMENTATION_TEMPLATE.md)
- [QUALITY_GATES.md](QUALITY_GATES.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
