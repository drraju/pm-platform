# PM Platform v1.1 Planning Package

This folder contains the planning package for PM Platform v1.1.

v1.1 focuses on Enterprise Planning: calendars, resource management, resource
allocation, baseline usability, portfolio enhancements, and safer scheduling
operations on top of the stabilized v1.0 RC1 Planning Workspace.

## Documents

| Document | Purpose |
| --- | --- |
| [PRD-v1.1.md](PRD-v1.1.md) | Product requirements, scope, personas, user stories, acceptance criteria, risks, milestones, and success metrics. |
| [TDD-v1.1.md](TDD-v1.1.md) | Technical design for calendars, resources, allocations, leveling, baselines, and portfolio enhancements. |
| [WBS-v1.1.md](WBS-v1.1.md) | Work Breakdown Structure with epics, features, tasks, complexity, and implementation order. |
| [ROADMAP-v1.1.md](ROADMAP-v1.1.md) | Four-sprint roadmap with dependencies between sprints. |
| [DATABASE-v1.1.md](DATABASE-v1.1.md) | Entity model, relationships, indexes, migration strategy, and scalability notes. |
| [API-v1.1.md](API-v1.1.md) | Planned REST API surface grouped by module. |
| [UI-v1.1.md](UI-v1.1.md) | Wireframe-level screen, dialog, menu, and navigation descriptions. |
| [RISKS-v1.1.md](RISKS-v1.1.md) | Technical, product, migration, performance, and security risks with mitigations. |
| [TESTING-v1.1.md](TESTING-v1.1.md) | Unit, integration, scheduling engine, performance, UAT, and regression testing strategy. |
| [IMPLEMENTATION-ORDER.md](IMPLEMENTATION-ORDER.md) | Safest implementation order, parallelization guidance, last-mile work, and branch strategy. |

## Planning Principles

- Build on the existing Planning Workspace and Scheduling Engine.
- Keep backend services as the authority for scheduling, permissions, and
  persistence.
- Make calendar and resource models additive before enabling recalculation or
  leveling behavior.
- Preserve existing project and planning workflows while introducing new
  enterprise planning depth.
- Avoid irreversible schema or UX commitments until data migration and UAT are
  validated.

## v1.1 Outcome

At the end of v1.1, PM Platform should support enterprise planning workflows
that combine schedule dates, calendars, resource availability, allocations,
baselines, and portfolio-level visibility in a coherent planning experience.
