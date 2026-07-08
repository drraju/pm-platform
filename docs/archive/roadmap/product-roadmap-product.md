# Product Roadmap

## Purpose

Define the PM Platform product roadmap and release direction.

## Scope

This document covers release themes, current priorities, future capabilities, long-term goals, and dependencies between planning, resource management, and portfolio planning.

## Audience

Product managers, executives, PMO leaders, engineering leads, QA engineers, and implementation stakeholders.

## Overview

The roadmap moves PM Platform from a project execution and governance foundation toward enterprise planning, resource management, portfolio planning, and AI-assisted delivery management.

## Contents

### Roadmap Principles

- Stabilize core project management before expanding advanced planning.
- Treat planning correctness as a prerequisite for Resource Management.
- Keep enterprise governance, visibility, and auditability central.
- Build incrementally with release-level validation.

### Release Roadmap

| Release | Theme | Primary Outcomes |
| --- | --- | --- |
| v1.0 | MVP project management | Projects, tasks, dashboard, auth, and core platform structure. |
| v1.0.5 | Enterprise hardening | Authorization, visibility, RAID, team operations, and usability corrections. |
| v1.0.6 | Planning foundation | Task hierarchy, milestones, dependencies, baselines, and project workspace planning support. |
| v1.1.0 | Planning Workspace | Gantt workspace, dependency controls, critical path indicators, and resource allocation overlays. |
| v1.1.1 | Planning Engine stabilization | CPM, schedule validation, transaction boundaries, performance, and resource readiness. |
| v1.2 | Resource Management | Capacity, calendars, allocation conflicts, and workload views. |
| v1.3 | Portfolio planning | Cross-project dependencies, portfolio roadmap, and scenario planning. |
| Future | AI-assisted PM | Intelligent schedule insights, risk detection, and project assistant workflows. |

### Near-term Priorities

1. Stabilize Planning Engine correctness.
2. Improve Gantt performance and accessibility.
3. Add resource capacity calculations.
4. Strengthen release validation and migration discipline.
5. Expand portfolio reporting with planning-aware signals.

### Long-term Goals

- Enterprise scheduling.
- Resource and capacity planning.
- Portfolio scenario planning.
- Cross-project dependency governance.
- Executive decision intelligence.
- AI-assisted delivery management.

### Dependencies

```text
Planning Workspace
  -> Planning Engine Stabilization
  -> Resource Management
  -> Portfolio Planning
  -> AI-assisted PM
```

## Related Documents

- [Vision](../../product/vision.md)
- [Feature Matrix](../../product/feature-matrix.md)
- [Planning Engine Roadmap](../../architecture/planning-engine-roadmap.md)
- [v1.1.1 Planning Engine Stabilization](../../releases/v1.1.1-planning-engine-stabilization.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created product roadmap framework. |
