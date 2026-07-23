# Architecture Vision

PM Platform is an enterprise project management platform for managing project execution, planning, delivery risk, portfolio visibility, and administrative planning foundations.

## Product Scope

Completed or current platform areas:

- Core Platform: auth, users, roles, permissions, project visibility.
- Project Management: projects, members, governance roles.
- Task Management: WBS, milestones, dependencies, task operations.
- Planning: planning workspace, snapshots, baselines, CPM scheduling engine.
- RAID: risks, assumptions, issues, dependencies, comments, history.
- Portfolio: executive and portfolio summaries.
- Notifications.
- Integrations: Slack boundary plus provider-independent external document links.
- Enterprise Calendar: domain model, REST API, and administration UI.

## Architectural North Star

The architecture should keep planning calculations deterministic and explainable. The Scheduling Engine remains the single authority for CPM, float, and critical path. Calendar and resource domains provide context and administrative data; they do not mutate schedule calculations unless an approved integration explicitly routes through Planning.

## Roadmap Direction

The approved roadmap moves from Enterprise Calendar foundations into resource management, scheduling integration, Gantt, capacity planning, portfolio scheduling, AI assistance, and SaaS multi-tenancy. Each step must be additive and must preserve stable Planning Workspace behavior.

## Design Values

| Value | Meaning |
| --- | --- |
| Stability | Existing v1.0 and v1.1 workflows must not regress. |
| Explicit boundaries | Planning, calendars, resources, portfolio, RAID, and auth have separate responsibilities. |
| Reviewability | Features are designed, implemented, tested, and committed one at a time. |
| Operational clarity | Docker, health checks, migrations, and tests are part of the architecture. |
| AI readiness | Documentation and prompts should make future assistant work safer and more consistent. |
