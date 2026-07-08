# Feature Matrix

## Purpose

Track PM Platform capabilities across current, planned, and future releases.

## Scope

This document covers project management, planning, RAID, dashboards, integrations, deployment, resource management, and portfolio planning.

## Audience

Product managers, engineering leads, QA engineers, executives, PMO stakeholders, and implementation teams.

## Overview

The feature matrix provides a shared view of platform maturity. It distinguishes completed foundations from stabilization work and future enterprise capabilities.

## Contents

### Status Legend

| Status | Meaning |
| --- | --- |
| Complete | Implemented and available for normal use. |
| Foundation | Initial implementation exists but requires hardening. |
| Planned | Targeted for an upcoming release. |
| Future | Product direction identified, release not yet committed. |

### Capability Matrix

| Capability | Status | Notes |
| --- | --- | --- |
| Multi-project support | Complete | Project list, project workspace, and project-scoped authorization exist. |
| User dashboard | Complete | User-specific work and health summaries. |
| Executive dashboard | Complete | Executive and portfolio visibility foundation. |
| RAID register | Complete | Risks, assumptions, issues, and dependencies with project context. |
| Kanban | Foundation | Task workflow visibility exists; advanced board configuration remains future work. |
| Timeline/Gantt | Foundation | Planning Workspace includes Gantt visualization. |
| Task hierarchy | Complete | Summary tasks and child tasks supported. |
| Milestones | Complete | Milestone task semantics supported. |
| Task dependencies | Foundation | Dependency model exists; enterprise schedule validation requires stabilization. |
| Critical path | Foundation | Indicator exists; CPM correctness planned for v1.1.1. |
| Resource allocations | Foundation | Allocation records exist; capacity and load calculations planned. |
| Resource Management | Planned | Depends on planning engine stabilization. |
| Portfolio planning | Future | Cross-project roadmap and scenario planning. |
| Slack integration | Foundation | Integration surface exists; workflow depth may expand. |
| Google Drive integration | Foundation | Integration surface exists; document workflow depth may expand. |
| PostgreSQL backend | Complete | TypeORM and PostgreSQL persistence. |
| Docker deployment | Complete | Docker Compose deployment path. |
| AI-assisted project management | Future | Long-term roadmap capability. |

### Enterprise Readiness Gaps

- Transaction-safe schedule recalculation.
- CPM-based critical path.
- Dependency-aware schedule edits.
- Resource capacity and calendar model.
- Large-plan UI virtualization.
- Cross-project dependencies.
- Audit-ready change history for planning operations.

## Related Documents

- [Vision](vision.md)
- [Product Roadmap](../roadmap/README.md)
- [Planning Engine Roadmap](../architecture/planning-engine-roadmap.md)
- [v1.1.1 Planning Engine Stabilization](../releases/v1.1.1-planning-engine-stabilization.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created feature matrix framework. |
