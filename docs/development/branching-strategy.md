# Branching Strategy

## Purpose

The branching strategy supports controlled enterprise delivery while keeping feature development simple.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Stable integration branch; deployable after validation |
| `release/*` | Release stabilization, UAT fixes, final documentation |
| `feature/*` | Isolated feature development |
| `hotfix/*` | Urgent production or UAT fixes |

## Feature Flow

```text
feature/* -> pull request -> main -> release/* -> tag -> deployment
```

## Hotfix Flow

```text
hotfix/* -> review -> main -> release branch if active -> tag
```

## Tagging

Tags should match release documentation and deployment artifacts. Use semantic versioning where practical, with beta labels for UAT releases.

## Versioning

Version numbers should communicate compatibility and release intent:

- Major: breaking platform release.
- Minor: feature release.
- Patch: bug fix or hardening.
- Beta suffix: customer/UAT candidate.

## Release Notes

Release notes must include:

- Scope.
- Features.
- Fixes.
- Migration notes.
- Known issues.
- Test results.

## Deployment Flow

1. Merge approved changes.
2. Run build and tests.
3. Prepare release notes.
4. Tag release.
5. Deploy to UAT.
6. Validate smoke tests.

## Rollback

Rollback requires a known good release tag and database backup compatibility. Migration risk must be reviewed before deployment.
