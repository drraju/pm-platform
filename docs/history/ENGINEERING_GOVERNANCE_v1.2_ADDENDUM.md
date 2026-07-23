# PM Platform Engineering Governance v1.2 Addendum

Engineering Governance Addendum Version: 1.2

Status: Approved

Builds on:
[ENGINEERING_GOVERNANCE_v1.1_ADDENDUM.md](ENGINEERING_GOVERNANCE_v1.1_ADDENDUM.md)

Start here:
[ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)

Authoritative Scope:
Defines additive infrastructure and release-verification governance learned from Feature 1.2.5 without modifying Engineering Governance v1.0 or the v1.1 Addendum.

This evolution pack is required reading for future feature infrastructure, verification, and release-readiness work after approval.

---

## 1. Executive Summary

Feature 1.2.5 demonstrated that release verification must follow repository reality rather than framework defaults. PM Platform uses a repository-owned migration runner, the `schema_migrations` ledger, and a Docker-first deployment model. Verification guidance must test those contracts directly.

This addendum introduces four Governance Improvements:

- GI-005: Repository-Specific Infrastructure Verification
- GI-006: Docker-First Platform Verification
- GI-007: Repository-Specific Verification Commands
- GI-008: Stage 7.5 and Stage 12 Verification Checklist Improvements

These improvements supplement Governance v1.0 and the v1.1 Addendum. They do not alter architecture, feature history, or previously approved stage records.

## 2. Governance Improvements

| Improvement | Authority | Outcome |
| --- | --- | --- |
| GI-005 | Migration verification | Prevents false findings caused by framework-default assumptions. |
| GI-006 | Deployment verification | Makes Docker Compose the primary verification boundary for container-equivalent deployments. |
| GI-007 | Verification commands | Establishes repeatable repository-specific checks. |
| GI-008 | Stage gates | Strengthens infrastructure and release-readiness evidence. |

All four improvements are additive. If any guidance conflicts with frozen Governance v1.0, Governance v1.0 remains authoritative until an approved governance decision states otherwise.

## 3. GI-005: Repository-Specific Infrastructure Verification

### Decision

Infrastructure verification must inspect the repository's implemented configuration before selecting commands, table names, paths, ports, or framework conventions.

PM Platform intentionally records applied SQL migrations in `schema_migrations`. Verification must not assume TypeORM's default `migrations` table or issue `SELECT * FROM migrations`.

### Required Migration Queries

List applied migrations:

```sql
SELECT filename,
       applied_at
FROM schema_migrations
ORDER BY applied_at;
```

Verify a feature migration:

```sql
SELECT filename,
       applied_at
FROM schema_migrations
WHERE filename LIKE '<feature migration>%';
```

Count applied migrations:

```sql
SELECT COUNT(*)
FROM schema_migrations;
```

### Verification Rules

- Read the repository migration runner before choosing verification queries.
- Confirm the expected migration filename, application count, and ordering.
- Verify fresh-install and upgraded-database behavior when persistence changes.
- Treat disagreement with framework defaults as a verification assumption to investigate, not an implementation defect.
- Record the exact query and observed result in release evidence.

## 4. GI-006: Docker-First Platform Verification

### Decision

PM Platform is a Docker-first application. For fully containerized deployments that use the same Compose services and images as the validated environment, Docker verification is the primary operating-system-independent release boundary.

Release verification must cover:

- Docker Compose service state
- PostgreSQL
- Redis
- backend health and startup
- frontend health and startup
- application health endpoint
- Swagger/OpenAPI generation
- runtime API behavior
- migration application
- seed and RBAC behavior

### Native Operating-System Verification

Native operating-system verification is required only when:

- packaging, native dependencies, networking, storage, or startup behavior differs by platform; or
- the target deployment differs materially from the validated containerized environment.

When neither condition applies, an Ubuntu host is not a separate application-behavior gate merely because it runs Docker. Reviewers must still confirm that the target host can run the approved Docker deployment.

This policy supplements existing release gates. It does not waive environment-specific verification when the deployment contract genuinely depends on the host.

### Evidence Classification

If native verification cannot be performed, the release assessment must state:

- the unavailable environment
- whether the deployment is container-equivalent
- Docker evidence already collected
- any unverified host-specific behavior
- whether the limitation is blocking, non-blocking, or deferred

Verification evidence must never be inferred or fabricated.

## 5. GI-007: Repository-Specific Verification Commands

Run commands from the repository root unless a subsection changes directories explicitly.

### Git

```bash
git status
git diff --stat
git diff --name-status
git diff --check
```

### Docker

```bash
docker compose ps
docker compose logs backend --tail=100
docker compose logs postgres --tail=50
```

### Database

```bash
docker compose exec -T postgres \
  psql -U postgres -d pm_platform -c \
  "SELECT filename, applied_at FROM schema_migrations ORDER BY applied_at;"
```

Feature-specific migration verification must use the exact migration filename or an appropriately scoped prefix:

```bash
docker compose exec -T postgres \
  psql -U postgres -d pm_platform -c \
  "SELECT filename, applied_at FROM schema_migrations WHERE filename LIKE '<feature migration>%';"
```

### Health

```bash
curl --fail http://localhost:3001/health
```

Expected result: HTTP 200 with the application, PostgreSQL, and Redis reported healthy.

### Swagger

```bash
curl --fail http://localhost:3001/api/docs-json
```

Verify that the feature's expected paths, methods, authentication requirements, and response contracts are present.

### RBAC

Permission verification must confirm:

- every expected permission exists exactly once
- no duplicate permission keys exist
- expected role grants exist
- existing permissions and grants remain intact
- repeated seed execution remains idempotent

Use the repository's actual `permissions`, `roles`, and role-permission relationship schema rather than assumed table names.

### Repository Cleanliness

```bash
git status --short --branch
git diff --stat
git diff --name-status
git diff --check
```

Generated, unrelated, or uncommitted files must be resolved or explicitly classified before approval.

## 6. GI-008: Stage 7.5 and Stage 12 Checklist Improvements

### Stage 7.5 Infrastructure Verification

Stage 7.5 must verify and record:

- [ ] Docker Compose services are running in their expected state.
- [ ] PostgreSQL is healthy and accepts connections.
- [ ] Redis is healthy.
- [ ] `schema_migrations` exists and is queryable.
- [ ] The latest expected migration is applied exactly once.
- [ ] The total migration count matches repository expectations.
- [ ] Seed execution succeeds and remains idempotent.
- [ ] `/health` returns HTTP 200.
- [ ] `/api/docs-json` is generated and contains the expected feature surface.
- [ ] Runtime API smoke verification succeeds.
- [ ] Backend and infrastructure logs contain no unexplained errors.
- [ ] The repository contains only expected stage changes.

The report must include commands, relevant results, environment identity, and any limitations.

### Stage 12 Release Readiness

Stage 12 must verify and record:

- [ ] Engineering readiness: builds, tests, lint, and formatting satisfy repository policy.
- [ ] Infrastructure readiness: required Docker services and dependencies are healthy.
- [ ] Documentation readiness: architecture, progress, backlog, release, and epic records agree.
- [ ] Release readiness: no unresolved blocking defects or governance findings remain.
- [ ] Repository cleanliness: expected commits exist and the working tree is clean.
- [ ] Migration verification uses `schema_migrations` and confirms the feature migration.
- [ ] Runtime verification covers health, Swagger, authorization, and feature workflows.
- [ ] Docker verification is current and reproducible.
- [ ] Ubuntu or other native-host verification is complete only when applicable under GI-006.

Every remaining observation must be classified as blocking, non-blocking, or deferred with a written rationale.

## 7. Files Requiring Updates

This evolution pack creates only this addendum. Governance v1.0, the v1.1 Addendum, ADRs, stage records, and completed feature documentation remain unchanged.

After governance approval, future process work should update the following documents by explicit, separate review:

- `docs/development/ENGINEERING_MANUAL.md`
- `docs/development/AI_DEVELOPMENT_PLAYBOOK.md`
- `docs/development/STAGE_EXECUTION_TEMPLATE.md`
- `docs/development/QUALITY_GATES.md`
- `docs/development/DEFINITION_OF_DONE.md`

Those updates should reference this addendum rather than duplicate its repository-specific rules.

## 8. Cross-Reference Updates

No existing cross-reference is changed by this pack. After approval:

- the Engineering Manual should list this addendum as required reading
- stage templates should reference GI-005 through GI-008 for infrastructure and release checks
- quality and completion checklists should link to the repository-specific commands in GI-007
- future feature records should reference the addendum version used for verification

Historical documents must retain the governance version that applied when they were approved.

## 9. Engineering Rationale

Repository-specific verification reduces false positives and makes findings reproducible. Docker-first verification tests the deployment contract actually shipped, while conditional host verification preserves rigor when platform differences are real. Explicit stage checklists ensure migration, seed, health, Swagger, RBAC, and repository evidence are gathered before release decisions.

The result is stricter where correctness matters and simpler where duplicate host-level checks add no new evidence.

## 10. Recommended Addendum Version

The recommended Engineering Governance Addendum version is **1.2**.

Version 1.2 incorporates the v1.1 lessons from Feature 1.2.3 and adds GI-005 through GI-008 from Feature 1.2.5. Governance v1.0 remains frozen and authoritative.

---

## Related Governance Documents

- [ENGINEERING_MANUAL.md](ENGINEERING_MANUAL.md)
- [ENGINEERING_GOVERNANCE_v1.1_ADDENDUM.md](ENGINEERING_GOVERNANCE_v1.1_ADDENDUM.md)
- [AI_DEVELOPMENT_PLAYBOOK.md](AI_DEVELOPMENT_PLAYBOOK.md)
- [STAGE_EXECUTION_TEMPLATE.md](STAGE_EXECUTION_TEMPLATE.md)
- [QUALITY_GATES.md](QUALITY_GATES.md)
- [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md)
- [CODE_REVIEW_CHECKLIST.md](CODE_REVIEW_CHECKLIST.md)
