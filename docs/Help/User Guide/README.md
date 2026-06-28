# User Guide

## Introduction

PM Platform is an enterprise project, task, planning, RAID, dashboard, and portfolio management application. This guide helps beta users understand what is available in the current release and how to exercise the main workflows.

### Purpose

Use this guide to:

- Log in and navigate the application.
- Validate project, task, planning, RAID, dashboard, portfolio, and reporting workflows.
- Understand what is Stable, Beta, Preview, or Planned in the current release.
- Find deeper documentation for specific workflows.

### Audience

| Audience | Primary use |
| --- | --- |
| End users | Day-to-day dashboard, task, and project review. |
| Project Managers | Project setup, planning, team, task, RAID, and baseline workflows. |
| Program Managers | Portfolio oversight, executive reporting, and cross-project review. |
| Delivery Leads | Delivery coordination, task execution, planning review, and RAID follow-up. |
| Technical Leads | Assigned work, task updates, dependency review, and delivery issue tracking. |

### Supported Browsers

| Browser | Support level |
| --- | --- |
| Chrome | Recommended |
| Edge | Supported |

### System Requirements

| Component | Requirement |
| --- | --- |
| Web application | `http://<server>:3000` |
| API | `http://<server>:3001` |
| Browser | Recent Chrome or Edge release |
| Network | Access to the deployed frontend and backend hosts |
| Authentication | Seeded beta account or provisioned user account |

## Feature Availability Matrix

| Module | Status | Recommended for Testing | Notes |
| --- | --- | --- | --- |
| Login | Stable | Yes | JWT-based login, session storage, and logout are implemented. |
| Dashboard | Stable | Yes | Personal dashboard shows assigned projects, task summary, upcoming tasks, risks, and issues. |
| Projects | Stable | Yes | Project list, filters, create, edit, delete, health sorting, and workspace navigation are implemented subject to permissions. |
| Tasks | Stable | Yes | My Tasks, all-visible scope, filters, status, percent complete, remarks, and reassignment are implemented. |
| Planning Workspace | Beta | Yes | Dedicated planning grid and Gantt surface with inline editing, dependencies, drag scheduling, zoom, Add Task, Add Child, row reorder, and WBS renumbering. |
| RAID | Beta | Yes | Risks, assumptions, issues, and dependencies support create, edit, delete, comments, ownership, and project association. |
| Portfolio | Beta | Limited | Portfolio summaries and drilldowns are implemented; advanced filtering and scenario planning are planned. |
| Reports | Preview | Limited | Reporting is available through Dashboard, Executive, Portfolio, and project summary views; no standalone report builder exists. |
| Users | Beta | Limited | User administration is available to roles with user or role management permissions. |
| Notifications | Preview | No | Notifications page exists as an empty-state placeholder. |
| Slack | Preview | No | Backend shell exists; no usable workflow or frontend integration is implemented. |
| Google Drive | Preview | No | Backend shell exists; no usable workflow or frontend integration is implemented. |
| Kanban | Planned | No | Project Kanban route redirects to Tasks. |
| Project Timeline route | Planned | No | Project Timeline route redirects to Projects; use Planning Workspace for the current Gantt view. |

## Test Accounts

The following accounts are defined in the current seed data. Non-admin seeded users use `Password123!`. The administrator account uses `admin` unless deployment environment variables override `SEED_SUPER_ADMIN_EMAIL` or `SEED_SUPER_ADMIN_PASSWORD`.

| Role | Email | Password | Purpose |
| --- | --- | --- | --- |
| Administrator | `admin@example.com` | `admin` | Full platform administration through the `SUPER_ADMIN` role. |
| Program Manager | `program.manager@example.com` | `Password123!` | Portfolio, executive dashboard, planning review, RAID, and cross-project governance. |
| Project Manager | `project.manager@example.com` | `Password123!` | Project setup, project updates, team management, task planning, RAID, and project execution. |
| Delivery Lead | `delivery.lead@example.com` | `Password123!` | Delivery execution, project updates, planning edits, task updates, and RAID follow-up. |
| Technical Lead | `technical.lead@example.com` | `Password123!` | Project review, assigned task updates, reassignment, and RAID contribution. |
| Engineer | `engineer@example.com` | `Password123!` | Contributor workflow, assigned task updates, remarks, and RAID contribution. |
| QA Engineer | `qa.engineer@example.com` | `Password123!` | QA contributor workflow, task updates, RAID validation, and regression testing. |

## Contents

1. [Login](#1-login)
2. [Dashboard](#2-dashboard)
3. [Projects](#3-projects)
4. [Planning Workspace](#4-planning-workspace)
5. [Tasks](#5-tasks)
6. [RAID](#6-raid)
7. [Portfolio](#7-portfolio)
8. [Reports](#8-reports)
9. [FAQ](#9-faq)

## 1. Login

### Purpose

Login authenticates users and loads role-appropriate navigation and permissions.

### Navigation

```text
/login
```

### Available Actions

- Enter email and password.
- Sign in.
- Log out from the top bar after authentication.

### Current Limitations

- Password reset and self-service account recovery are not implemented.
- Seeded beta users should use the credentials listed above unless the deployment owner has changed them.

Screenshot placeholder:

```text
[ Screenshot - Login ]
```

## 2. Dashboard

### Purpose

Dashboard is the personal operating view for assigned work and delivery health.

### Navigation

```text
/dashboard
```

### Available Actions

| Action | Description |
| --- | --- |
| Review task summary | View total, in-progress, blocked, and overdue task counts. |
| Review delivery health | See health status and supporting reasons. |
| Open assigned projects | Navigate directly into project workspaces. |
| Review upcoming tasks | See near-term assigned work. |
| Review open risks and issues | See RAID items owned by or relevant to the user. |

### Current Limitations

- Dashboard widgets are operational summaries, not configurable reports.
- Data depends on seeded or customer-loaded projects, tasks, and RAID items.

Screenshot placeholder:

```text
[ Screenshot - Dashboard ]
```

## 3. Projects

### Purpose

Projects are the main workspace for project setup, project metadata, health, team membership, execution planning, baselines, and project-scoped RAID.

### Navigation

| Area | Route |
| --- | --- |
| Project list | `/projects` |
| Project workspace | `/projects/<projectId>` |

### Available Actions

| Action | Description |
| --- | --- |
| View projects | Review projects visible to your role and memberships. |
| Filter and sort | Filter by status, search by name, and sort by health or creation date. |
| Create project | Available to roles with project creation permission. |
| Edit project | Update metadata, dates, status, owner, sponsor, and delivery lead where permitted. |
| Delete project | Available to roles with project deletion permission. |
| Open workspace | Select a project to open overview, health, plan, baselines, team, and RAID tabs. |

### Current Limitations

- Project access and edit controls depend on role permissions and project membership.
- Project-specific Kanban and Timeline routes are not implemented in this beta.

### Related Documentation

- [Project Management](../../user-guide/project-management.md)

Screenshot placeholder:

```text
[ Screenshot - Projects ]
```

## 4. Planning Workspace

### Purpose

Planning Workspace provides the current enterprise schedule surface with a planning grid and Gantt-style timeline.

### Navigation

```text
/projects/<projectId>/planning
```

### Available Actions

| Action | Description |
| --- | --- |
| Add Task | Create a top-level planning task at the end of the top-level list. |
| Add Child | Create a child task under the selected parent. |
| Inline edit | Edit title, owner, start, finish, duration, percent complete, and status. |
| Drag schedule | Move a Gantt bar horizontally to update planned dates. |
| Resize schedule | Resize non-summary bars to update finish dates. |
| Zoom | Switch between Day, Week, Month, and Quarter timeline scales. |
| Fit to Project | Scale the timeline so the project fits the visible Gantt area. |
| Today | Scroll to the current date marker. |
| Dependencies | Create and delete schedule dependencies. |
| Reorder tasks | Drag rows within the same sibling group and update WBS numbering. |

### Current Limitations

- Advanced CPM-grade critical path calculation is planned.
- Dependency-aware schedule validation is planned.
- Resource leveling and capacity management are not available in the UI.
- Planning dependency editing in the dedicated Planning Workspace is limited compared with create/delete workflows.

### Related Documentation

- [Planning Workspace](../../user-guide/planning-workspace.md)

Screenshot placeholder:

```text
[ Screenshot - Planning Workspace ]
```

## 5. Tasks

### Purpose

Tasks are execution-level work items assigned to users and project teams.

### Navigation

```text
/tasks
```

### Available Actions

| Action | Description |
| --- | --- |
| View assigned tasks | Use the default My Tasks scope. |
| View all visible tasks | Switch scope where role permissions allow. |
| Filter tasks | Filter by project, status, timing, and sort order. |
| Update status | Change task status such as Todo, In Progress, Blocked, or Done. |
| Update completion | Change percent complete. |
| Add remarks | Capture progress notes or blockers. |
| Reassign | Reassign tasks where permitted. |

### Current Limitations

- Task create/delete is primarily managed through project workspaces and planning surfaces, not the My Tasks list.
- Task edit availability depends on permissions and project membership.

Screenshot placeholder:

```text
[ Screenshot - Tasks ]
```

## 6. RAID

### Purpose

RAID captures governance records for Risks, Assumptions, Issues, and Dependencies.

### Navigation

| Area | Route |
| --- | --- |
| Combined RAID register | `/raid` |
| Risks | `/risks` |
| Issues | `/issues` |
| Project-scoped RAID | `/projects/<projectId>` RAID tabs |

### Available Actions

| Area | Description |
| --- | --- |
| Risks | Track potential events, probability, impact, mitigation, owner, and status. |
| Assumptions | Track assumptions, validation state, owner, and notes. |
| Issues | Track active delivery problems, severity or priority, owner, resolution plan, and status. |
| Dependencies | Track governance dependencies, owners, due dates, and dependency source. |
| Comments | Add follow-up notes where update permission is available. |

### Current Limitations

- RAID dependencies are governance records and are separate from Planning Workspace schedule dependencies.
- Dedicated Risks and Issues pages exist; assumptions and RAID dependencies are managed from the combined RAID page or project workspace tabs.

### Related Documentation

- [RAID Management](../../user-guide/raid-management.md)

Screenshot placeholder:

```text
[ Screenshot - RAID ]
```

## 7. Portfolio

### Purpose

Portfolio provides cross-project visibility for delivery health and attention areas.

### Navigation

```text
/portfolio
```

### Available Actions

| Action | Description |
| --- | --- |
| Review project health | See total, green, amber, and red project counts. |
| Review open risks | View risk exposure grouped by severity. |
| Review open issues | View issue exposure grouped by priority. |
| Review overdue tasks | Identify overdue work across visible projects. |
| Review milestones | See upcoming milestone-style tasks. |
| Open drilldowns | Select summary cards and links to navigate into filtered project, task, risk, and issue views. |

### Current Limitations

- Portfolio filtering is limited to current summary and drilldown behavior.
- Portfolio scenario planning and cross-project dependency planning are planned.

### Related Documentation

- [Portfolio Dashboard](../../user-guide/portfolio-dashboard.md)

Screenshot placeholder:

```text
[ Screenshot - Portfolio ]
```

## 8. Reports

### Purpose

Reports are currently delivered through dashboard and summary views rather than a standalone reporting module.

### Navigation

| Report surface | Route | Status |
| --- | --- | --- |
| User dashboard | `/dashboard` | Stable |
| Executive dashboard | `/executive` | Beta |
| Portfolio dashboard | `/portfolio` | Beta |
| Project health and workspace summaries | `/projects/<projectId>` | Beta |

### Available Actions

- Review dashboard summary cards.
- Open project, task, risk, and issue drilldowns.
- Review project health and attention areas.

### Current Limitations

- No standalone report builder is implemented.
- No PDF or spreadsheet export workflow is implemented.
- Executive and portfolio dashboards are the primary reporting experience for this beta.

Screenshot placeholder:

```text
[ Screenshot - Reports ]
```

## 9. FAQ

| Question | Answer |
| --- | --- |
| Where do I start after logging in? | Start with Dashboard for personal work or Projects for project-level validation. |
| Where is the Gantt view? | Use the dedicated Planning Workspace at `/projects/<projectId>/planning`. |
| Is the Project Timeline route implemented? | No. The project-specific Timeline route redirects in the current beta. |
| Is Kanban implemented? | No dedicated project Kanban board is implemented; the project Kanban route redirects to Tasks. |
| Are RAID dependencies the same as schedule dependencies? | No. RAID dependencies are governance records; Planning Workspace dependencies are schedule links. |
| Can I edit every project? | Editing depends on role permissions and project membership context. |
| Can contributors update tasks? | Yes, contributors can update assigned task details where permissions allow. |
| Are Slack and Google Drive available? | Not yet. Backend shells exist, but usable integration workflows are not implemented. |
| Are notifications available? | The Notifications page exists as an empty-state placeholder. |
| Where should beta issues be logged? | Use the feedback template in the [UAT Test Guide](../../releases/UAT-v1.0.0-beta2-Test-Guide.md) or the active UAT bug log process. |

