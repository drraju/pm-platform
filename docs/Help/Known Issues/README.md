# Known Issues

This document lists current beta limitations confirmed from the repository and existing release/UAT documentation. It is organized by module so testers can quickly distinguish supported workflows from Beta, Preview, and Planned capabilities.

## Status Legend

| Status | Meaning |
| --- | --- |
| Beta | Implemented and testable, with stabilization or refinement still planned. |
| Preview | Visible as a shell, dashboard, or early workflow, but not a complete module. |
| Planned | Not implemented as an end-user workflow in this beta. |

## Planning Workspace

| Issue | Status | Current behavior |
| --- | --- | --- |
| Advanced schedule validation | Beta | Gantt drag/resize and dependency creation exist, but dependency-aware scheduling enforcement is planned. |
| Critical Path | Beta | Critical path indicators exist; CPM-grade critical path calculation is planned for stabilization. |
| Planning dependency editing | Beta | The dedicated Planning Workspace supports create/delete dependency workflows; richer dependency editing remains limited. |
| Resource management | Planned | Resource capacity/allocation foundations exist in backend planning models, but resource leveling and capacity workflows are not available in the UI. |
| Large schedule performance | Beta | Large-plan virtualization and performance work are planned. |

## Projects

| Issue | Status | Current behavior |
| --- | --- | --- |
| Project Kanban route | Planned | `/projects/<id>/kanban` redirects to `/tasks`; no dedicated Kanban board is implemented. |
| Project Timeline route | Planned | `/projects/<id>/timeline` redirects to `/projects`; the current Gantt experience is the Planning Workspace. |
| Project-specific RAID route | Planned | `/projects/<id>/raid` redirects to `/raid`; project-scoped RAID is available inside Project Workspace tabs. |

## Reports and Portfolio

| Issue | Status | Current behavior |
| --- | --- | --- |
| Standalone report builder | Preview | Reports are available through Dashboard, Executive, Portfolio, and Project Workspace summary views; no report builder exists. |
| Export workflows | Planned | PDF/spreadsheet report export is not implemented. |
| Portfolio filtering | Beta | Portfolio drilldowns exist, but advanced portfolio filtering and scenario planning are planned. |

## Notifications and Integrations

| Issue | Status | Current behavior |
| --- | --- | --- |
| Notifications | Preview | `/notifications` displays an empty state; notification delivery and read-state workflows are not implemented. |
| Slack | Planned | Backend module shell exists without usable controller routes or frontend workflow. |
| External document links | Beta | Project document metadata and external URLs are supported without provider authentication. |

## Navigation and Search

| Issue | Status | Current behavior |
| --- | --- | --- |
| Global search | Preview | Search input is visible in the shell; full global search behavior is not implemented. |
| Planning Workspace discovery | Beta | Dedicated Planning Workspace is available at `/projects/<projectId>/planning`; it is separate from the Project Workspace Plan tab. |

## Roles and Permissions

| Issue | Status | Current behavior |
| --- | --- | --- |
| Role administration depth | Beta | User administration exists for authorized roles; complete role-permission management workflows remain limited. |
| Edit availability by role | Beta | Some actions are intentionally permission- and membership-sensitive, so testers should validate expected visibility by seeded role. |

## UAT Defect Tracking

Use the active UAT bug log for detailed test findings:

- [UAT bug log](../../testing/uat-bug-log-v1.1.0.1.md)

## Feedback Template

| Field | Entry |
| --- | --- |
| Tester Name |  |
| Date |  |
| Browser | Chrome / Edge |
| Role Tested |  |
| Module |  |
| Issue |  |
| Steps to Reproduce |  |
| Expected |  |
| Actual |  |
| Severity | Critical / High / Medium / Low |
| Screenshot | Attach image or paste link |
