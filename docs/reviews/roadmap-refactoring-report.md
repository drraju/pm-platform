# Roadmap Refactoring Report

## Purpose

Document the Documentation Refactoring Sprint Phase 5 changes for roadmap
documentation.

## Scope

This phase consolidated roadmap documentation into the canonical
`docs/roadmap/` folder and archived duplicate roadmap files.

## Summary

- Created the canonical roadmap index at `docs/roadmap/README.md`.
- Created the canonical active roadmap files:
  - `docs/roadmap/backlog.md`
  - `docs/roadmap/v1.1.md`
  - `docs/roadmap/future.md`
- Archived duplicate roadmap drafts under `docs/archive/roadmap/`.
- Updated active documentation links that pointed to archived roadmap files.
- Preserved all roadmap documentation; no roadmap content was deleted.

## Canonical Roadmap Files

| File | Purpose |
| --- | --- |
| `docs/roadmap/README.md` | Roadmap index and maintenance rules. |
| `docs/roadmap/backlog.md` | Prioritized parking lot for product work. |
| `docs/roadmap/v1.1.md` | Near-term enterprise planning roadmap. |
| `docs/roadmap/future.md` | Long-term portfolio intelligence and AI-assisted project management direction. |

## Archived Roadmap Files

| Previous location | Archive location | Reason |
| --- | --- | --- |
| `docs/roadmap/beta-3.md` | `docs/archive/roadmap/beta-3-roadmap.md` | Superseded beta-specific roadmap. |
| `docs/roadmap/beta-4.md` | `docs/archive/roadmap/beta-4-roadmap.md` | Superseded beta-specific roadmap. |
| `docs/roadmap/product-roadmap.md` | `docs/archive/roadmap/product-roadmap-docs-roadmap.md` | Duplicate product roadmap content. |
| `docs/roadmap.md` | `docs/archive/roadmap/root-roadmap.md` | Legacy root roadmap summary. |
| `docs/product-roadmap.md` | `docs/archive/roadmap/root-product-roadmap.md` | Legacy root product roadmap stub. |
| `docs/product/product-roadmap.md` | `docs/archive/roadmap/product-roadmap-product.md` | Duplicate roadmap content moved out of product docs. |
| `roadmap/backlog.md` | `docs/archive/roadmap/root-roadmap-backlog.md` | Duplicate root roadmap backlog. |
| `roadmap/ideas.md` | `docs/archive/roadmap/root-roadmap-ideas.md` | Duplicate root roadmap ideas file. |
| `roadmap/technical-debt.md` | `docs/archive/roadmap/root-roadmap-technical-debt.md` | Duplicate root roadmap technical debt file. |
| `roadmap/v1.0.md` | `docs/archive/roadmap/root-roadmap-v1.0.md` | Duplicate root roadmap version file. |
| `roadmap/v1.1.md` | `docs/archive/roadmap/root-roadmap-v1.1.md` | Duplicate root roadmap version file. |
| `roadmap/v1.2.md` | `docs/archive/roadmap/root-roadmap-v1.2.md` | Duplicate root roadmap version file. |

## Link Updates

Active links previously pointing to `docs/product/product-roadmap.md` now point
to `docs/roadmap/README.md`.

Updated files:

- `docs/Help/About/README.md`
- `docs/architecture/planning-engine-roadmap.md`
- `docs/architecture/system-architecture.md`
- `docs/product/README.md`
- `docs/product/feature-matrix.md`
- `docs/product/vision.md`
- `docs/releases/v1.0.6.md`
- `docs/user-guide/planning-workspace.md`
- `docs/user-guide/portfolio-dashboard.md`

## Verification

- Confirmed `docs/roadmap/` contains only:
  - `README.md`
  - `backlog.md`
  - `v1.1.md`
  - `future.md`
- Confirmed duplicate roadmap files are preserved under `docs/archive/roadmap/`.
- Confirmed active documentation no longer links to archived product roadmap
  filenames.
- Ran a scoped Markdown link check across `docs/roadmap/` and
  `docs/archive/roadmap/`.

## Follow-Up Recommendations

- Add archive banners to files under `docs/archive/roadmap/`.
- Decide whether the empty root `roadmap/` folder should be removed in a future
  repository cleanup phase.
- Add roadmap status metadata when roadmap items become committed release scope.
