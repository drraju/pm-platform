# Planning Engine Roadmap

## Purpose

Define the roadmap for evolving PM Platform from a planning workspace into an enterprise-grade scheduling and resource planning engine.

## Scope

This document covers scheduling logic, dependency validation, critical path, resource calculations, data integrity, performance, and staged delivery before Resource Management.

## Audience

Engineering leads, backend engineers, frontend engineers, product managers, QA engineers, and PMO stakeholders.

## Overview

The current Planning Workspace establishes schedule snapshots, Gantt visualization, dependencies, and resource allocation foundations. The next phase must stabilize the planning engine so downstream Resource Management can rely on correct dates, critical path, dependency constraints, and resource load calculations.

## Contents

### Target Planning Engine

```text
Tasks
  -> Schedule Snapshot
  -> Dependency Graph
  -> Scheduling Rules
  -> Critical Path and Float
  -> Resource Load
  -> Workspace Read Model
```

### Roadmap Phases

| Phase | Goal | Outcome |
| --- | --- | --- |
| Foundation | Task hierarchy, planned dates, dependencies, and baselines. | Planning data model is available. |
| Workspace | Tree grid, Gantt, dependency management, critical path indicators. | Users can inspect and adjust schedules. |
| Engine Stabilization | CPM, validation, recalculation, transactions, and performance hardening. | Planning data becomes reliable enough for enterprise usage. |
| Resource Management | Capacity, calendars, allocation conflicts, and workload views. | Resource planning can use stable schedule inputs. |
| Portfolio Planning | Cross-project dependencies, portfolio roadmap, and scenario planning. | Portfolio-level planning becomes possible. |

### Scheduling Capabilities

- Dependency type handling: FS, SS, FF, and SF.
- Lag and lead support.
- Circular dependency prevention.
- Schedule consistency validation.
- Summary task rollups.
- Milestone handling.
- Critical path and total float calculation.

### Critical Path Direction

```text
Forward pass:  early start / early finish
Backward pass: late start / late finish
Float:         late start - early start
Critical:      float = 0 on the driving path
```

### Resource Calculation Direction

- Resource capacity by user and date.
- Allocation demand by task date range.
- Over-allocation detection.
- Calendar and working-day rules.
- Project and portfolio load views.

### Performance Direction

- Backend schedule projection endpoint optimized for Gantt rendering.
- Frontend virtualization for 500+ tasks.
- Dependency graph computation using indexed maps.
- Incremental recalculation for localized schedule changes.
- Lazy loading for large portfolios.

## Related Documents

- [v1.1.0 Planning Workspace](../archive/architecture/v1.1.0-planning-workspace.md)
- [v1.1.1 Planning Engine](../archive/architecture/v1.1.1-planning-engine.md)
- [Product Roadmap](../roadmap/README.md)
- [Feature Matrix](../product/feature-matrix.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created planning engine roadmap framework. |
