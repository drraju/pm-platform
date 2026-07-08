# Documentation Audit

## Audit Scope

This audit reviews the current `docs/` directory only. It does not modify,
rename, move, archive, or delete any existing documentation.

Audit date: 2026-07-08

## Executive Summary

The documentation set contains strong coverage across architecture, planning,
release notes, reviews, UAT, product direction, and user guides. The main issues
are structural rather than content quality:

- several documents duplicate the same concepts in different folders
- ADR numbering is inconsistent and contains duplicate numbers
- root-level index links point to files that do not currently exist
- roadmap, release, review, product, and help documentation overlap
- historical documents are mixed with current reference documents
- naming conventions vary between uppercase, lowercase, spaces, and hyphenated
  filenames
- several folders need README indexes to clarify purpose and navigation

## 1. Duplicate Documents

| Current location | Recommended location | Reason | Risk | Migration effort |
| --- | --- | --- | --- | --- |
| `docs/adr/ADR-001 Scheduling Engine Architecture.md`, `docs/adr/ADR-001-scheduling-engine.md` | Keep one canonical ADR at `docs/adr/ADR-001-scheduling-engine.md`; archive or redirect the spaced filename to `docs/history/adr/ADR-001-scheduling-engine-legacy.md` | Both describe Scheduling Engine architecture and share the same ADR number/title. | High: readers may cite different ADRs with different levels of detail. | Medium |
| `docs/adr/ADR-001-Planning-Engine.md`, `docs/adr/ADR-001-scheduling-engine.md` | Renumber Planning Engine ADR to the next available canonical ADR number, or fold it into `docs/architecture/planning-engine-v2.md` if it is no longer a decision record. | Two ADR-001 files define related but distinct planning/scheduling authority. | High: ADR sequence becomes unreliable. | Medium |
| `docs/adr/ADR-002 WBS Model.md`, `docs/adr/ADR-002-Project-Workspace.md` | Renumber one ADR and standardize both filenames under `docs/adr/ADR-00X-kebab-case-title.md`. | Duplicate ADR-002 numbering. | High: ADR references become ambiguous. | Medium |
| `docs/adr/ADR-003 Summary Task Semantics.md`, `docs/adr/ADR-003-Scheduling-Authority.md` | Renumber one ADR and standardize filenames. | Duplicate ADR-003 numbering. | High: future ADR links and reviews may point to the wrong decision. | Medium |
| `docs/product/product-roadmap.md`, `docs/roadmap/product-roadmap.md`, `docs/product-roadmap.md`, `docs/roadmap.md` | Use `docs/roadmap/README.md` for roadmap index and move product-facing roadmap content to `docs/roadmap/product-roadmap.md`; archive old root roadmap summaries. | Product roadmap content exists in four locations with different detail and currency. | High: roadmap consumers may follow obsolete release direction. | Medium |
| `docs/product/vision.md`, `docs/vision/PRODUCT-VISION.md`, `docs/vision/product-philosophy.md` | Use `docs/product/vision.md` as canonical product vision and place philosophy/AI vision under `docs/product/vision/` or `docs/vision/` with an index. | Vision content is split by folder and naming style. | Medium: product intent can drift between documents. | Medium |
| `docs/deployment.md`, `docs/docker.md`, `docs/installation.md`, `docs/development/deployment.md`, `docs/architecture/deployment.md` | Use `docs/deployment/README.md` as deployment index with separate `installation.md`, `docker.md`, `operations.md`, and `architecture.md`. | Deployment information is scattered across root, development, and architecture folders. | Medium: operators may miss required setup or rollback details. | Medium |
| `docs/Help/User Guide/README.md`, `docs/user-guide/*.md` | Keep `docs/user-guide/` as canonical user documentation; make `docs/Help/` a generated or curated end-user help layer that links back to canonical guides. | User guidance exists both as a monolithic Help guide and topic-specific guides. | Medium: help content may lag behind user guides. | Medium |
| `docs/Help/Release Notes/README.md`, `docs/releases/*.md` | Keep `docs/releases/` as canonical release history; make Help release notes a summary index. | Release information is duplicated between Help and releases. | Low to medium: Help summary can become stale. | Low |
| `docs/development/testing.md`, `docs/development/testing-guidelines.md`, `docs/testing/release-checklist.md`, `docs/testing/role-validation-matrix.md` | Keep strategy under `docs/development/testing.md`; keep execution artifacts under `docs/testing/`; merge or cross-link `testing-guidelines.md`. | Testing strategy and testing execution overlap. | Medium: teams may follow inconsistent quality gates. | Low |

## 2. Obsolete Documents

| Current location | Recommended location | Reason | Risk | Migration effort |
| --- | --- | --- | --- | --- |
| `docs/roadmap.md` | `docs/history/roadmap/roadmap-v0.md` | Contains an early v0.x/v1.x roadmap that conflicts with newer planning and beta roadmap files. | High: appears current because it sits at docs root. | Low |
| `docs/architecture/currentstate13jun26.md` | `docs/history/architecture/current-state-2026-06-13.md` | Dated current-state snapshot; valuable historically but not a current architecture reference. | Medium: may be mistaken for current platform state. | Low |
| `docs/architecture/release-0.2-gap-analysis.md` | `docs/history/reviews/release-0.2-gap-analysis.md` | Old release-specific analysis belongs with historical reviews. | Low: useful context, but not current architecture. | Low |
| `docs/releases/v0.2.0 - Planning & Gantt` | `docs/history/releases/v0.2.0-planning-gantt.md` | Old release artifact has no `.md` extension and uses spaces/symbols. | Medium: tooling may skip it and readers may miss it. | Low |
| `docs/ARCHITECTURE.md` | `docs/architecture/README.md` or `docs/architecture/system-architecture.md` | Root architecture file is a short diagram and duplicates richer architecture docs. | Medium: root index may send users to an incomplete architecture summary. | Low |
| `docs/deployment.md`, `docs/docker.md`, `docs/installation.md` | `docs/deployment/README.md`, `docs/deployment/docker.md`, `docs/deployment/installation.md` | Current files are brief stubs and overlap with detailed development/deployment documents. | Medium: deployment entry points look complete but are thin. | Medium |

## 3. Historical Documents That Should Be Archived

| Current location | Recommended location | Reason | Risk | Migration effort |
| --- | --- | --- | --- | --- |
| `docs/releases/RELEASE-v1.0.0-beta2.md` | `docs/history/releases/RELEASE-v1.0.0-beta2.md` | Beta release note is historical once current release docs supersede it. | Low: still useful as release history. | Low |
| `docs/releases/UAT-v1.0.0-beta2-Test-Guide.md` | `docs/history/uat/UAT-v1.0.0-beta2-Test-Guide.md` | UAT guide is release-specific historical evidence. | Low: should remain discoverable for audit. | Low |
| `docs/testing/UAT-Beta-4.0.md` | `docs/history/uat/UAT-Beta-4.0.md` | Beta-specific UAT plan should not live beside current testing strategy forever. | Low: historical validation may be confused with current test plan. | Low |
| `docs/testing/v1.0.5.9.2-uat-findings.md` | `docs/history/uat/v1.0.5.9.2-uat-findings.md` | Release-specific UAT findings are historical records. | Low: useful for traceability. | Low |
| `docs/testing/uat-bug-log-v1.1.0.1.md` | `docs/history/uat/uat-bug-log-v1.1.0.1.md` after closure | Versioned UAT bug log should move once release is closed. | Medium if active; low after closure. | Low |
| `docs/reviews/v1.0.1-authorization-review.md` | `docs/history/reviews/v1.0.1-authorization-review.md` | Versioned review belongs in historical reviews after remediation. | Low: review is valuable but not current guidance. | Low |
| `docs/reviews/v1.0.5-*.md`, `docs/reviews/v1.0.6-architecture-readiness-review.md` | `docs/history/reviews/` | Versioned investigation and readiness documents are historical decision/support artifacts. | Low: should not compete with current review backlog. | Low |
| `docs/releases/v1.0.3-*` through `docs/releases/v1.0.5.9.3-*` | `docs/history/releases/` when superseded by release index | Patch-level release notes are useful history but clutter current release navigation. | Medium: hard to identify current release. | Medium |

## 4. Inconsistent Naming

| Current location | Recommended location | Reason | Risk | Migration effort |
| --- | --- | --- | --- | --- |
| `docs/Help/` and subfolders with spaces such as `Keyboard Shortcuts`, `Release Notes`, `User Guide` | `docs/help/keyboard-shortcuts/`, `docs/help/release-notes/`, `docs/help/user-guide/` | Mixed case and spaces complicate links and tooling. | Medium: URL encoding and case-sensitive environments can break navigation. | Medium |
| `docs/adr/ADR-001 Scheduling Engine Architecture.md` and other ADRs with spaces | `docs/adr/ADR-001-scheduling-engine.md` style | ADR filenames should be stable, lower-case, hyphenated, and link-friendly. | High: duplicate ADR numbering and spaces cause ambiguity. | Medium |
| `docs/vision/PRODUCT-VISION.md` | `docs/vision/product-vision.md` or `docs/product/vision.md` | Uppercase filename differs from surrounding style and active IDE tab expectation. | Medium: case-sensitive systems may confuse product vision paths. | Low |
| `docs/ARCHITECTURE.md` | `docs/architecture/README.md` or `docs/architecture.md` with canonical casing | Root uppercase differs from root lowercase docs and current active tab naming. | Medium: links to `architecture.md` and `ARCHITECTURE.md` are not interchangeable on all filesystems. | Low |
| `docs/releases/v0.2.0 - Planning & Gantt` | `docs/releases/v0.2.0-planning-gantt.md` or historical equivalent | Missing extension and spaces/symbols make it inconsistent with release naming. | Medium: Markdown tooling may ignore it. | Low |
| `docs/architecture/currentstate13jun26.md` | `docs/history/architecture/current-state-2026-06-13.md` | Uses compressed date and inconsistent naming. | Low: discoverability and sorting suffer. | Low |
| `docs/screenshots/project detail.png` | `docs/screenshots/project-detail.png` | Space in asset filename complicates Markdown links and automation. | Low: asset references can become fragile. | Low |
| `docs/testing/UAT-Beta-4.0.md` | `docs/testing/uat-beta-4.0.md` or historical equivalent | Mixed uppercase and release casing differs from other docs. | Low: navigation consistency issue. | Low |

## 5. Broken Documentation Hierarchy

| Current location | Recommended location | Reason | Risk | Migration effort |
| --- | --- | --- | --- | --- |
| `docs/README.md` links to `DEPLOYMENT.md`, `API.md`, and `RELEASES.md` | Create or retarget to `docs/deployment.md`, `docs/development/api-guidelines.md`, and `docs/releases/README.md` | The current index has broken links for `API.md` and `RELEASES.md`; `DEPLOYMENT.md` casing does not match `deployment.md`. | High: first-time readers hit dead links from the main docs entry point. | Low |
| `docs/architecture/` contains current architecture, roadmap, release gap analysis, and dated current-state documents | Keep only active architecture in `docs/architecture/`; move historical and roadmap material to `docs/history/` and `docs/roadmap/`. | Architecture folder mixes durable architecture with release planning and historical snapshots. | Medium: harder to identify authoritative architecture. | Medium |
| `docs/product/`, `docs/vision/`, `docs/product-roadmap.md`, and `docs/roadmap/` | Use `docs/product/` for product strategy and `docs/roadmap/` for build sequencing; archive root duplicates. | Product vision, roadmap, and requirements are spread across competing locations. | Medium: product direction may diverge. | Medium |
| `docs/releases/` includes release notes and UAT guides | Keep release notes in `docs/releases/`; move UAT plans/findings to `docs/testing/` while active and `docs/history/uat/` after closure. | Release and test execution artifacts have different audiences and lifecycles. | Low to medium: release folder becomes hard to scan. | Medium |
| `docs/reviews/` contains active reviews and historical investigations without lifecycle labels | Add `docs/reviews/README.md` and later split active reviews from archived reviews. | Readers cannot tell which reviews require action. | Medium: stale findings may be treated as active defects. | Low |
| `docs/history/` exists but has no files or index | Add `docs/history/README.md` before migration. | Intended archive location is currently invisible and unused. | Low: no obvious place to move historical docs. | Low |
| `docs/screenshots/` contains binary assets and `.DS_Store` | Keep screenshots under `docs/assets/screenshots/` with an index or usage notes. | Assets are mixed with documentation files and include OS metadata. | Low: clutter and weak traceability. | Low |

## 6. Missing Documentation

| Current location | Recommended location | Reason | Risk | Migration effort |
| --- | --- | --- | --- | --- |
| Missing `docs/API.md` | `docs/API.md` or `docs/api/README.md` | Root index links to API docs, but no API entry point exists. | High: API consumers lack a clear contract reference. | Medium |
| Missing `docs/RELEASES.md` or `docs/releases/README.md` | Prefer `docs/releases/README.md` and update root index accordingly. | Release notes exist but there is no canonical release index. | Medium: difficult to find current vs historical releases. | Low |
| Missing `docs/DEPLOYMENT.md` with current root index casing | Either create `docs/DEPLOYMENT.md` or retarget to `docs/deployment.md`. | Current root index casing does not match existing file. | Medium on case-sensitive systems. | Low |
| Missing `docs/adr/README.md` | `docs/adr/README.md` | ADR folder needs a canonical index, numbering policy, and status table. | High: duplicate ADR numbering already exists. | Low |
| Missing `docs/reviews/README.md` | `docs/reviews/README.md` | Reviews need status, ownership, and archive rules. | Medium: no distinction between active and historical findings. | Low |
| Missing `docs/releases/README.md` | `docs/releases/README.md` | Release folder has many files but no summary or current-release pointer. | Medium: release history is hard to navigate. | Low |
| Missing `docs/roadmap/README.md` | `docs/roadmap/README.md` | Roadmap folder has multiple planning docs but no entry point. | Medium: roadmap and product-roadmap overlap remains unclear. | Low |
| Missing `docs/testing/README.md` | `docs/testing/README.md` | Testing folder contains UAT, bug logs, checklist, and role validation without an index. | Medium: QA artifacts are hard to separate by lifecycle. | Low |
| Missing `docs/user-guide/README.md` | `docs/user-guide/README.md` | User guides exist by topic but lack a canonical index outside Help. | Low to medium: user docs are discoverable only from root/Help links. | Low |
| Missing `docs/product/README.md` | `docs/product/README.md` | Product folder has several strategy docs but no navigation index. | Medium: product docs overlap with vision and roadmap folders. | Low |
| Missing `docs/vision/product-vision.md` | Consolidate as `docs/product/vision.md` or create `docs/vision/README.md` pointing to canonical vision. | IDE context references `docs/vision/product-vision.md`, but current file is `PRODUCT-VISION.md`. | Medium: case/name mismatch can confuse contributors. | Low |

## 7. Documents That Should Become Indexes

| Current location | Recommended location | Reason | Risk | Migration effort |
| --- | --- | --- | --- | --- |
| `docs/README.md` | Keep as root documentation index. | It should be the entry point for all documentation and link only to canonical indexes. | High if links remain broken or point to stubs. | Low |
| `docs/architecture/README.md` | Keep as architecture index, trim any roadmap/tree notes into child docs. | It is already close to an index but currently includes architecture principles and a future planning tree. | Low: can become too long for navigation. | Low |
| `docs/roadmap/product-roadmap.md` | `docs/roadmap/README.md` plus `docs/roadmap/product-roadmap.md` | The roadmap folder needs a landing page that distinguishes current, future, backlog, and historical roadmap docs. | Medium: roadmap files compete for authority. | Low |
| `docs/product/vision.md` | Keep as product vision document; add `docs/product/README.md` as index. | Product vision should not also be the product folder index. | Low: better navigation. | Low |
| `docs/Help/README.md` | Keep as Help index, but clarify whether Help is source, generated content, or user-facing documentation. | Help currently duplicates user guides and release notes. | Medium: content can drift. | Low |
| `docs/releases/` no index | `docs/releases/README.md` | A release index should identify current release, supported release, archived releases, and UAT links. | Medium: release folder is long and hard to scan. | Low |
| `docs/reviews/` no index | `docs/reviews/README.md` | Reviews need active/open/archived grouping. | Medium: stale investigations can look current. | Low |
| `docs/testing/` no index | `docs/testing/README.md` | Testing docs need lifecycle, release validation, UAT, and bug-log sections. | Medium: testing evidence is hard to navigate. | Low |

## 8. Recommended Folder Structure

Recommended target structure:

```text
docs/
├── README.md
├── api/
│   └── README.md
├── architecture/
│   ├── README.md
│   ├── backend.md
│   ├── frontend.md
│   ├── planning/
│   │   ├── README.md
│   │   ├── scheduling-engine.md
│   │   ├── graph-engine.md
│   │   ├── forward-pass.md
│   │   ├── backward-pass.md
│   │   ├── float-engine.md
│   │   └── critical-path-engine.md
│   └── security.md
├── adr/
│   ├── README.md
│   ├── ADR-001-scheduling-engine.md
│   └── ADR-00X-kebab-case-title.md
├── deployment/
│   ├── README.md
│   ├── installation.md
│   ├── docker.md
│   └── operations.md
├── development/
│   ├── README.md
│   ├── api-guidelines.md
│   ├── branching-strategy.md
│   ├── coding-standards.md
│   ├── testing.md
│   └── ui-guidelines.md
├── product/
│   ├── README.md
│   ├── vision.md
│   ├── feature-matrix.md
│   ├── personas.md
│   └── requirements/
├── roadmap/
│   ├── README.md
│   ├── product-roadmap.md
│   ├── backlog.md
│   └── beta/
├── releases/
│   ├── README.md
│   └── current-release.md
├── reviews/
│   ├── README.md
│   └── documentation-audit.md
├── testing/
│   ├── README.md
│   ├── release-checklist.md
│   └── role-validation-matrix.md
├── user-guide/
│   ├── README.md
│   ├── planning-workspace.md
│   ├── portfolio-dashboard.md
│   ├── project-management.md
│   └── raid-management.md
├── assets/
│   └── screenshots/
└── history/
    ├── README.md
    ├── architecture/
    ├── releases/
    ├── reviews/
    └── uat/
```

| Current location | Recommended location | Reason | Risk | Migration effort |
| --- | --- | --- | --- | --- |
| `docs/architecture/*.md` planning engine files | `docs/architecture/planning/*.md` | Groups scheduling engine internals under one planning architecture namespace. | Medium: many links need updates. | Medium |
| `docs/deployment.md`, `docs/docker.md`, `docs/installation.md` | `docs/deployment/` | Deployment deserves a dedicated folder and index. | Medium: root links and operations docs need retargeting. | Medium |
| `docs/Help/` | `docs/help/` or generated help output outside canonical docs | Normalize naming and clarify whether Help duplicates user guides. | Medium: many encoded links need update. | Medium |
| `docs/screenshots/` | `docs/assets/screenshots/` | Assets should live under an assets folder. | Low: image references may need update. | Low |
| `docs/vision/` | `docs/product/vision/` or fold into `docs/product/` | Product vision is a product concern and currently duplicates product folder content. | Medium: consolidate carefully to avoid losing AI/product principles. | Medium |
| `docs/history/` | Keep and populate with archived release/review/UAT/current-state docs. | Provides a clear archive destination. | Low: improves lifecycle clarity. | Medium |

## Implementation Plan

### Phase 0: Freeze and Inventory

1. Freeze documentation moves during cleanup.
2. Create an authoritative inventory of all docs and owners.
3. Mark each document as `current`, `duplicate`, `historical`, `stub`, or
   `candidate archive`.
4. Decide canonical naming convention: lower-case, hyphenated filenames, no
   spaces, `.md` extension.

### Phase 1: Repair Navigation

1. Fix root `docs/README.md` links to existing targets or create the missing
   index files.
2. Add indexes for `docs/adr/`, `docs/releases/`, `docs/reviews/`,
   `docs/testing/`, `docs/roadmap/`, `docs/product/`, and `docs/user-guide/`.
3. Add status tables to ADR and release indexes.
4. Document the difference between ADR, architecture, roadmap, release notes,
   reviews, and testing evidence.

### Phase 2: Canonicalize ADRs

1. Select the canonical ADR-001 Scheduling Engine document.
2. Renumber duplicate ADR-001, ADR-002, and ADR-003 files.
3. Standardize ADR filenames.
4. Update ADR cross-links.
5. Add an ADR numbering and status policy.

### Phase 3: Consolidate Product, Vision, and Roadmap

1. Choose canonical product vision location.
2. Consolidate duplicate roadmap files into `docs/roadmap/`.
3. Archive old root-level roadmap summaries.
4. Split product strategy from build sequencing.
5. Add roadmap status sections for current, next, future, and backlog.

### Phase 4: Separate Current Docs From History

1. Create or populate `docs/history/README.md`.
2. Move closed release, UAT, review, and current-state snapshots into
   `docs/history/`.
3. Keep active testing and release docs in `docs/testing/` and
   `docs/releases/`.
4. Add back-links from history docs to current canonical docs where useful.

### Phase 5: Restructure Deployment and API Docs

1. Create `docs/deployment/README.md`.
2. Move installation, Docker, environment, upgrade, backup, and rollback content
   into the deployment folder.
3. Create `docs/api/README.md` and link to API guidelines and future generated
   OpenAPI documentation.
4. Update root and development indexes.

### Phase 6: Validate and Maintain

1. Run a Markdown link check after moves.
2. Remove `.DS_Store` files from docs and add ignore rules if needed.
3. Add a documentation review checklist to PR guidance.
4. Require docs updates when architecture, API, deployment, or product behavior
   changes.
5. Review the documentation tree at each release candidate.
