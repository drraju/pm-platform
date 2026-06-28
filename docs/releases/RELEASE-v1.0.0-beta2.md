# PM Platform v1.0.0-beta2 Release Notes

## Overview

PM Platform v1.0.0-beta2 is a wider beta/UAT release for validating the current enterprise project management foundation. The release focuses on project execution, task management, RAID governance, portfolio visibility, role-based access, and the dedicated Planning Workspace.

This release is intended for controlled beta testing with internal users and selected customer stakeholders. It is not a final production release for advanced resource management, portfolio scenario planning, notification automation, or external integrations.

## Highlights

| Area | Summary |
| --- | --- |
| Project execution | Project list, project workspace, project metadata, team membership, task planning, baselines, and project-scoped RAID workflows. |
| Task management | My Tasks, all-visible task scope, filters, inline task operations, remarks, percent complete, status updates, and reassignment. |
| RAID governance | Risks, assumptions, issues, and dependencies with create, update, delete, comments, ownership, and project association. |
| Dashboards | Personal dashboard, executive dashboard, portfolio dashboard, project health, drilldowns, and delivery attention summaries. |
| Planning Workspace | Planning grid and Gantt-style interaction for schedule review and updates. |
| Role-based access | Seeded enterprise roles and permission-aware navigation/action visibility. |

## Planning Workspace Improvements

| Capability | Status | Notes |
| --- | --- | --- |
| Inline editing | Beta | Edit task title, owner, start, finish, duration, percent complete, and status directly in the planning grid. |
| Add Task | Beta | Creates a top-level planning task at the end of the top-level list. |
| Add Child | Beta | Creates a child task as the last child of the selected parent. |
| Row reordering | Beta | Drag rows within the same sibling group to reorder tasks. |
| WBS renumbering | Beta | WBS numbering recalculates after insertion and reorder while preserving task IDs and hierarchy. |
| Gantt drag scheduling | Beta | Drag task bars horizontally to update planned dates. |
| Gantt resize | Beta | Resize non-summary bars to update finish dates. |
| Dependencies | Beta | Create and delete Planning Workspace schedule dependencies. |
| Zoom controls | Beta | Zoom In, Zoom Out, Day, Week, Month, Quarter, Fit to Project, and Today controls are available. |
| Today marker | Beta | Today is highlighted and can be scrolled into view. |

## Infrastructure Improvements

| Area | Summary |
| --- | --- |
| Docker deployment | Dockerfiles and Docker Compose support local/container deployment validation. |
| PostgreSQL backend | PostgreSQL is the primary database backend. |
| Environment configuration | `.env.example` documents deployment/runtime configuration expectations. |
| Development scripts | Repository scripts support local development workflow setup. |
| Health foundations | Backend health and startup validation foundations are present. |

## Developer Improvements

| Area | Summary |
| --- | --- |
| TypeScript contracts | Frontend API client types cover current project, task, planning, RAID, dashboard, portfolio, and user workflows. |
| Frontend tests | Vitest coverage validates dashboard, projects, planning, tasks, RAID, portfolio, navigation, and modal behavior. |
| Backend tests | Service and integration tests cover core backend modules and authorization foundations. |
| Documentation structure | Help documentation is organized into About, User Guide, Release Notes, Known Issues, and Keyboard Shortcuts. |

## Bug Fixes and Stabilization

| Area | Summary |
| --- | --- |
| Planning task insertion | Add Task appends to the correct top-level position. |
| Planning child insertion | Add Child appends as the last child and focuses the new task. |
| Planning reorder persistence | Row reorder persists through existing schedule update APIs. |
| Planning zoom usability | Timeline scale can be controlled without browser zoom. |
| Drilldowns | Dashboard, executive, portfolio, project, risk, issue, and task drilldowns preserve expected filters. |
| Modal usability | Modal footer/action usability has been hardened in previous stabilization work. |
| Role visibility | Seeded enterprise roles have improved navigation and action visibility alignment. |

## Known Limitations

| Area | Limitation |
| --- | --- |
| Planning engine | Advanced dependency-aware schedule validation and CPM-grade critical path calculation are planned. |
| Resource management | Resource leveling and capacity workflows are not available in the UI. |
| Reports | Reporting is currently dashboard-based; no standalone report builder or export workflow exists. |
| Notifications | Notifications page exists as an empty-state placeholder. |
| Slack | Backend shell exists, but no usable integration workflow is implemented. |
| Google Drive | Backend shell exists, but no usable integration workflow is implemented. |
| Kanban | Project-specific Kanban route redirects to Tasks. |
| Timeline | Project-specific Timeline route redirects to Projects; use Planning Workspace for the current Gantt view. |
| Global search | Search input is visible, but full global search behavior is not implemented. |

## Future Roadmap

| Area | Planned direction |
| --- | --- |
| Planning | Stabilize scheduling correctness, dependency validation, critical path, and large-plan performance. |
| Dependency editing | Expand schedule dependency editing and validation depth. |
| Resource Management | Add capacity planning, allocation, utilization, and leveling workflows. |
| Portfolio planning | Add cross-project dependencies, roadmap views, scenario planning, and richer filtering. |
| Baselines | Add variance reporting and baseline analytics. |
| Notifications | Add notification delivery, read state, and event-driven alerts. |
| Slack | Add connection, project/channel mapping, and notification/event workflows. |
| Google Drive | Add connection and project document workflows. |
| Reports | Add report builder/export workflows after dashboard reporting stabilizes. |
| AI Project Manager | Explore AI-assisted planning, risk detection, status summarization, and delivery recommendations. |

## Related Documents

- [UAT v1.0.0-beta2 Test Guide](UAT-v1.0.0-beta2-Test-Guide.md)
- [Help Documentation](../Help/README.md)
- [Known Issues](../Help/Known%20Issues/README.md)
- [User Guide](../Help/User%20Guide/README.md)

