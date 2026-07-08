# ADR Migration Report

## Purpose

Document the ADR folder refactor performed during Documentation Refactoring
Sprint Phase 2.

## Scope

This migration refactored only ADR documentation, the ADR links in
`docs/README.md`, and this migration report.

No source code was modified.

## Summary

- Removed duplicate active ADR numbering.
- Preserved every ADR document.
- Archived the superseded Scheduling Engine ADR under `docs/archive/adr/`.
- Renamed active ADRs to consistent `ADR-00X-kebab-case-title.md` filenames.
- Updated ADR headings to match the new active ADR numbers.
- Updated `docs/README.md` to link to the canonical active ADR files.

## Active ADR Mapping

| Previous location | New location | Notes |
| --- | --- | --- |
| `docs/adr/ADR-001-scheduling-engine.md` | `docs/adr/ADR-001-scheduling-engine.md` | Kept as canonical ADR-001 because it is the most complete Scheduling Engine ADR. |
| `docs/adr/ADR-001-Planning-Engine.md` | `docs/adr/ADR-002-planning-engine.md` | Renumbered to remove duplicate ADR-001. |
| `docs/adr/ADR-002 WBS Model.md` | `docs/adr/ADR-003-wbs-model.md` | Renumbered to remove duplicate ADR-002 and normalized filename. |
| `docs/adr/ADR-002-Project-Workspace.md` | `docs/adr/ADR-004-project-workspace.md` | Renumbered to remove duplicate ADR-002. |
| `docs/adr/ADR-003-Scheduling-Authority.md` | `docs/adr/ADR-005-scheduling-authority.md` | Renumbered to remove duplicate ADR-003. |
| `docs/adr/ADR-003 Summary Task Semantics.md` | `docs/adr/ADR-006-summary-task-semantics.md` | Renumbered to remove duplicate ADR-003 and normalized filename. |
| `docs/adr/ADR-004 Milestone Categories.md` | `docs/adr/ADR-007-milestone-categories.md` | Renumbered to preserve sequence and normalized filename. |
| `docs/adr/ADR-005 ScheduleAnalysis Model.md` | `docs/adr/ADR-008-schedule-analysis-model.md` | Renumbered to preserve sequence and normalized filename. |
| `docs/adr/ADR-006 Dependency Validation.md` | `docs/adr/ADR-009-dependency-validation.md` | Renumbered to preserve sequence and normalized filename. |

## Archived ADRs

| Previous location | Archive location | Reason |
| --- | --- | --- |
| `docs/adr/ADR-001 Scheduling Engine Architecture.md` | `docs/archive/adr/ADR-001-scheduling-engine-legacy.md` | Superseded by the more complete canonical `docs/adr/ADR-001-scheduling-engine.md`. |

## Active ADR Index After Migration

| ADR | Title | Location |
| --- | --- | --- |
| ADR-001 | Scheduling Engine Architecture | `docs/adr/ADR-001-scheduling-engine.md` |
| ADR-002 | Planning Engine | `docs/adr/ADR-002-planning-engine.md` |
| ADR-003 | WBS Model | `docs/adr/ADR-003-wbs-model.md` |
| ADR-004 | Project Workspace | `docs/adr/ADR-004-project-workspace.md` |
| ADR-005 | Scheduling Authority | `docs/adr/ADR-005-scheduling-authority.md` |
| ADR-006 | Summary Task Semantics | `docs/adr/ADR-006-summary-task-semantics.md` |
| ADR-007 | Milestone Categories | `docs/adr/ADR-007-milestone-categories.md` |
| ADR-008 | ScheduleAnalysis Model | `docs/adr/ADR-008-schedule-analysis-model.md` |
| ADR-009 | Dependency Validation | `docs/adr/ADR-009-dependency-validation.md` |

## README Updates

`docs/README.md` now links to the active ADR-001 through ADR-009 files. ADR-010
remains a placeholder.

## Remaining Follow-Up

- Add `docs/adr/README.md` as the canonical ADR index in a future phase.
- Update non-ADR cross-links that may still point to old ADR filenames in a
  later documentation-wide migration.
- Decide whether archived ADRs should receive explicit superseded banners.
