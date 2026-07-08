# Architecture Refactoring Report

## Purpose

Document the Documentation Refactoring Sprint Phase 3 changes for
`docs/architecture`.

## Scope

This phase refactored only:

- `docs/architecture/`
- `docs/archive/architecture/`
- `docs/reviews/architecture-refactoring-report.md`

No ADR documents were modified. No product documentation was modified.

## Summary

- Archived historical architecture documents.
- Archived obsolete milestone-specific architecture documents.
- Kept current architecture documents in `docs/architecture/`.
- Rebuilt `docs/architecture/README.md` as the architecture index.
- Updated scoped architecture links affected by archive moves and prior ADR
  renames.

## Current Architecture Documents

The following documents remain active under `docs/architecture/`:

| Location | Classification |
| --- | --- |
| `docs/architecture/README.md` | Architecture index |
| `docs/architecture/ai-assistant.md` | Current domain architecture |
| `docs/architecture/backend.md` | Current platform architecture |
| `docs/architecture/backward-pass.md` | Current scheduling architecture |
| `docs/architecture/critical-path-engine.md` | Current scheduling architecture |
| `docs/architecture/database-erd.md` | Current data architecture |
| `docs/architecture/deployment.md` | Current deployment architecture |
| `docs/architecture/float-engine.md` | Current scheduling architecture |
| `docs/architecture/forward-pass.md` | Current scheduling architecture |
| `docs/architecture/frontend.md` | Current platform architecture |
| `docs/architecture/graph-engine.md` | Current scheduling architecture |
| `docs/architecture/planning-engine-roadmap.md` | Current planning architecture direction |
| `docs/architecture/planning-engine-v2.md` | Current planning architecture |
| `docs/architecture/portfolio-engine.md` | Current domain architecture |
| `docs/architecture/project-workspace.md` | Current workspace architecture |
| `docs/architecture/reporting-engine.md` | Current domain architecture |
| `docs/architecture/role-visibility-matrix.md` | Current visibility architecture |
| `docs/architecture/scheduling-engine-performance.md` | Current scheduling architecture |
| `docs/architecture/scheduling-engine.md` | Current scheduling architecture |
| `docs/architecture/security.md` | Current security architecture |
| `docs/architecture/system-architecture.md` | Current system architecture |

## Archived Documents

| Previous location | New location | Reason |
| --- | --- | --- |
| `docs/architecture/current-state.md` | `docs/archive/architecture/current-state.md` | Historical current-state planning assessment. |
| `docs/architecture/currentstate13jun26.md` | `docs/archive/architecture/current-state-2026-06-13.md` | Dated architecture snapshot. |
| `docs/architecture/platform-history.md` | `docs/archive/architecture/platform-history.md` | Historical platform timeline, not current architecture. |
| `docs/architecture/release-0.2-gap-analysis.md` | `docs/archive/architecture/release-0.2-gap-analysis.md` | Release-specific gap analysis. |
| `docs/architecture/runtime-role-validation-matrix.md` | `docs/archive/architecture/runtime-role-validation-matrix.md` | Version-specific runtime validation artifact. |
| `docs/architecture/planning-engine/planning-toolbar.md` | `docs/archive/architecture/planning-toolbar-v1.0.md` | Obsolete milestone-specific planning toolbar note. |
| `docs/architecture/v1.0.6-planning-foundation-architecture.md` | `docs/archive/architecture/v1.0.6-planning-foundation-architecture.md` | Obsolete milestone-specific architecture document. |
| `docs/architecture/v1.0.7-planning-engine-phase-rollup-enhancement.md` | `docs/archive/architecture/v1.0.7-planning-engine-phase-rollup-enhancement.md` | Obsolete milestone-specific architecture document. |
| `docs/architecture/v1.1.0-planning-workspace.md` | `docs/archive/architecture/v1.1.0-planning-workspace.md` | Obsolete milestone-specific architecture document. |
| `docs/architecture/v1.1.1-planning-engine.md` | `docs/archive/architecture/v1.1.1-planning-engine.md` | Obsolete milestone-specific architecture document. |

## Link Updates

| File | Update |
| --- | --- |
| `docs/architecture/planning-engine-roadmap.md` | Retargeted links for archived `v1.1.0` and `v1.1.1` planning architecture documents. |
| `docs/architecture/planning-engine-v2.md` | Retargeted ADR links to the current canonical ADR filenames. |
| `docs/archive/architecture/v1.1.0-planning-workspace.md` | Retargeted links that broke after moving the file into the archive. |
| `docs/archive/architecture/v1.1.1-planning-engine.md` | Retargeted links that broke after moving the file into the archive. |

## Verification

- Confirmed active `docs/architecture/` contains current architecture documents.
- Confirmed archived architecture documents are preserved under
  `docs/archive/architecture/`.
- Ran a scoped Markdown link check across `docs/architecture/` and
  `docs/archive/architecture/`.
- The scoped link check reported no missing relative links.

## Follow-Up Recommendations

- Add `docs/archive/README.md` in a later archive-wide documentation phase.
- Decide whether archived architecture documents should include explicit
  archived/superseded banners.
- Consider moving planning-specific architecture into a future
  `docs/architecture/planning/` folder once current links are stable.
