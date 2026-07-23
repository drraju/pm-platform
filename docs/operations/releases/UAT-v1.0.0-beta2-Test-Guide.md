# PM Platform UAT Test Guide

## Document Control

| Field | Value |
| --- | --- |
| Product name | PM Platform |
| Release version | v1.0.0-beta2 |
| Release date | 2026-06-28 |
| Document purpose | Provide a structured end-user test guide for validating the current beta release. |
| Primary audience | Project Managers, Program Managers, Delivery Leads, Technical Leads, QA Engineers, Product Owners |
| Application URL | `http://<server>:3000` |
| API URL | `http://<server>:3001` |

## Table of Contents

1. [Overview](#overview)
2. [Purpose and Scope](#purpose-and-scope)
3. [Environment](#environment)
3. [Test Accounts](#test-accounts)
4. [Suggested Test Flow](#suggested-test-flow)
5. [Current Feature Status](#current-feature-status)
6. [User Role Capabilities](#user-role-capabilities)
7. [UAT Test Scenarios](#uat-test-scenarios)
8. [Known Limitations](#known-limitations)
9. [Feedback Template](#feedback-template)
10. [Release Notes](#release-notes)
11. [Future Roadmap](#future-roadmap)

## Overview

PM Platform is an enterprise project, portfolio, planning, task, and RAID management application built with Next.js, NestJS, TypeScript, PostgreSQL, and Docker.

The purpose of v1.0.0-beta2 is to validate the current end-to-end delivery management experience with internal testers and selected customer stakeholders. This beta focuses on project setup, task execution, RAID governance, portfolio visibility, role-based access, and the Planning Workspace foundation, including Gantt-style schedule editing and task ordering.

This release is suitable for controlled user acceptance testing. It is not positioned as a final production release for large-scale portfolio planning, resource management, or external integration workflows.

## Purpose and Scope

### Purpose

This document is the primary beta/UAT guide for testers validating PM Platform v1.0.0-beta2.

### Scope of Beta

The beta covers:

- Login and role-aware navigation.
- Personal dashboard.
- Project list and Project Workspace.
- Task execution workflows.
- Dedicated Planning Workspace.
- RAID management.
- Portfolio and executive dashboard summaries.
- User administration visibility for authorized roles.
- Placeholder and planned-module boundary validation.

### What Is Being Tested

| Area | Validation focus |
| --- | --- |
| Core access | Login, logout, seeded users, role-aware navigation. |
| Projects | Create, edit, delete, filter, sort, and open workspace. |
| Planning | Add Task, Add Child, inline edit, drag schedule, resize schedule, zoom, Today, Fit to Project, dependencies, reorder, WBS renumbering, refresh persistence. |
| Tasks | Status, percent complete, remarks, reassignment, filters, and task scope. |
| RAID | Risks, assumptions, issues, dependencies, comments, ownership, and status changes. |
| Portfolio and reports | Dashboard summaries, executive view, portfolio cards, and drilldowns. |
| Boundaries | Notifications, Slack, Google Drive, Kanban, Timeline, and other incomplete areas are clearly marked and do not appear as complete workflows. |

### Intended Audience

| Audience | Primary testing focus |
| --- | --- |
| Project Managers | Project setup, task planning, RAID management, Planning Workspace updates |
| Program Managers | Portfolio and executive visibility, multi-project oversight, planning review |
| Delivery Leads | Project execution, task ownership, RAID follow-up, team coordination |
| Technical Leads | Assigned work, project plan validation, task updates, dependencies |
| QA Engineers | Functional coverage, regression testing, role validation, defect reporting |
| Product Owners | Workflow usability, release readiness, acceptance criteria validation |

### Known Limitations Summary

This beta includes a strong project execution and planning foundation, but several areas remain Beta, Placeholder, or Planned. Notifications are a placeholder UI, Slack and Google Drive integration workflows are not implemented, project-specific Kanban and Timeline routes redirect to broader pages, and advanced planning engine capabilities such as resource leveling, CPM-grade critical path validation, and portfolio-level dependency planning remain planned work.

## Environment

### Web Application

Open the application in a supported browser:

```text
http://<server>:3000
```

### API

The backend API is available at:

```text
http://<server>:3001
```

### Supported Browsers

| Browser | Support level | Notes |
| --- | --- | --- |
| Chrome | Recommended | Primary browser for UAT execution. |
| Edge | Supported | Validate core workflows and layout behavior. |

### Login

1. Navigate to `http://<server>:3000/login`.
2. Enter one of the seeded test account emails and passwords below.
3. Confirm that the application redirects to the correct dashboard or workspace.

Screenshot placeholder:

```text
[Screenshot: Login page]
```

## Test Accounts

The following accounts are created by the current seed script. Non-admin seeded users use the shared development password `Password123!`. The administrator account defaults to `admin`, unless the deployment overrides `SEED_SUPER_ADMIN_EMAIL` or `SEED_SUPER_ADMIN_PASSWORD`.

| Role | Email | Password | Purpose |
| --- | --- | --- | --- |
| Administrator | `admin@example.com` | `admin` | Full platform administration and permission coverage through `SUPER_ADMIN`. |
| Program Manager | `program.manager@example.com` | `Password123!` | Portfolio, executive dashboard, project oversight, planning review, RAID, and task governance. |
| Project Manager | `project.manager@example.com` | `Password123!` | Project creation, project updates, team management, task planning, RAID, and project execution. |
| Delivery Lead | `delivery.lead@example.com` | `Password123!` | Delivery execution, project updates, team coordination, planning edits, task updates, and RAID follow-up. |
| Technical Lead | `technical.lead@example.com` | `Password123!` | Project review, assigned task updates, task reassignment, RAID creation and updates. |
| Engineer | `engineer@example.com` | `Password123!` | Contributor workflow, assigned task updates, comments/remarks, RAID contribution. |
| QA Engineer | `qa.engineer@example.com` | `Password123!` | QA contributor workflow, assigned task updates, RAID validation, regression testing. |

Seeded data also includes three projects, project memberships, project tasks, risks, issues, assumptions, and RAID dependencies.

## Suggested Test Flow

Use the following path for a full end-to-end beta test pass:

```text
Login
  -> Dashboard
  -> Projects
  -> Open Project
  -> Planning Workspace
  -> Add Task
  -> Add Child
  -> Reorder Tasks
  -> Dependencies
  -> Zoom
  -> Today
  -> Fit to Project
  -> Inline Editing
  -> Tasks
  -> RAID
  -> Portfolio
  -> Logout
```

Screenshot placeholders:

```text
[Screenshot: Dashboard]
[Screenshot: Project Workspace]
[Screenshot: Planning Workspace]
[Screenshot: RAID]
[Screenshot: Portfolio]
```

## Current Feature Status

| Module | Status | Notes |
| --- | --- | --- |
| Login and session handling | Production Ready | JWT login, session storage, logout, and role-aware landing behavior are implemented. |
| User dashboard | Production Ready | Shows assigned projects, task summary, upcoming tasks, open risks, open issues, and health. |
| Executive dashboard | Beta | Read-only portfolio reporting for users with `executive.view`; available to Program Manager and Administrator. |
| Projects | Production Ready | Project list, filters, health sorting, create, edit, delete, and project workspace navigation are implemented subject to permissions. |
| Project Workspace | Beta | Includes overview, health, plan grid, baselines, team, and project-scoped RAID tabs. |
| Tasks | Production Ready | My Tasks and all-visible task views with status, completion, remarks, reassignment, filters, and save actions. |
| Planning Workspace | Beta | Dedicated project planning page with planning grid, Gantt timeline, inline editing, add task, add child, row reorder, drag scheduling, resize scheduling, zoom controls, today, fit to project, and dependencies. |
| Dependencies | Beta | Project workspace task dependencies and Planning Workspace schedule dependencies can be created, edited in project plan context, and deleted where supported. |
| RAID | Production Ready | Risks, assumptions, issues, and dependencies support create, edit, delete, comments, ownership, status, and project association. |
| Notifications | Placeholder | Navigation and empty-state page exist; notification delivery and read-state workflows are not implemented in the UI. |
| Portfolio | Beta | Portfolio summary, project health drilldowns, open risk/issue summaries, overdue tasks, milestones, and projects requiring attention are implemented. |
| Reports | Placeholder | Executive and portfolio dashboards provide reporting views; there is no separate report builder or export workflow. |
| Users | Beta | User administration is available to roles with user or role management permission. Advanced role-permission administration remains limited. |
| Baselines | Beta | Project Workspace supports baseline capture and review for planning snapshots. Advanced variance reporting remains planned. |
| Kanban | Not Implemented | Project-specific Kanban route redirects to Tasks; no dedicated board interaction is implemented in this beta. |
| Timeline route | Not Implemented | Project-specific Timeline route redirects to Projects; the active Gantt experience is in the Planning Workspace. |
| Slack | Not Implemented | Backend module shell exists, but no usable controller routes or frontend workflow are implemented. |
| Google Drive | Not Implemented | Backend module shell exists, but no usable controller routes or frontend workflow are implemented. |
| Docker deployment | Beta | Docker files, Compose configuration, environment template, and development scripts exist for deployment validation. |

## User Role Capabilities

### Administrator

**What to test**

- Login and global navigation.
- Access to all visible modules.
- Project, task, RAID, user, portfolio, and planning workflows.
- Role visibility and permission-sensitive buttons.

**What they can edit**

- Projects, users, roles where exposed, tasks, project team membership, RAID items, and planning schedules.

**What they should not expect yet**

- Full workflow configuration, complete role-permission UI, notification automation, Slack setup, or Google Drive setup.

### Program Manager

**What to test**

- Executive dashboard.
- Portfolio dashboard.
- Multi-project visibility.
- Project health drilldowns.
- Planning review and task governance.

**What they can edit**

- Projects, project team membership, tasks, RAID items, planning schedules, and baselines where permissions and membership allow.

**What they should not expect yet**

- Portfolio-level dependency planning, scenario planning, resource leveling, or report export.

### Project Manager

**What to test**

- Project create, edit, delete.
- Project Workspace Plan, Baselines, Team, and RAID tabs.
- Planning Workspace task creation, child task creation, inline edit, dependency, drag schedule, resize schedule, zoom, and reorder workflows.

**What they can edit**

- Projects, team membership, project tasks, task dependencies, RAID items, baselines, and planning schedule rows.

**What they should not expect yet**

- Dedicated project Kanban board, dedicated project Timeline route, resource management, or advanced critical path validation.

### Delivery Lead

**What to test**

- Delivery-owned project workspaces.
- Task planning and execution updates.
- RAID follow-up.
- Team and task coordination.

**What they can edit**

- Project details, project team membership, tasks, dependencies, planning schedules, RAID items, and assigned work where permissions and project context allow.

**What they should not expect yet**

- Program-level portfolio planning, external integrations, or resource capacity workflows.

### Technical Lead

**What to test**

- Assigned task updates.
- Reassignment controls where available.
- Project visibility.
- RAID creation and updates.
- Planning read/review behavior.

**What they can edit**

- Assigned task status, completion, remarks, reassignment where permitted, and RAID items.

**What they should not expect yet**

- Broad project administration, project deletion, team administration, or complete planning control unless granted by role and project context.

### Engineer

**What to test**

- My Tasks workflow.
- Status, percent complete, remarks, and reassignment behavior.
- Project visibility for assigned/member projects.
- RAID contribution.

**What they can edit**

- Assigned task updates and RAID items where permissions allow.

**What they should not expect yet**

- Project creation, project deletion, team management, baseline capture, or full planning administration.

### QA Engineer

**What to test**

- Contributor task workflow.
- Regression coverage for project, tasks, RAID, and planning.
- Browser compatibility in Chrome and Edge.
- Error handling and permission-sensitive UI.

**What they can edit**

- Assigned task updates and RAID items where permissions allow.

**What they should not expect yet**

- Full administrator access, external integration workflows, project deletion, or advanced planning engine validation.

## UAT Test Scenarios

### Scenario 1: Login

**Objective:** Confirm each seeded user can authenticate and reach an appropriate landing page.

**Steps**

1. Open `http://<server>:3000/login`.
2. Log in as `project.manager@example.com` with `Password123!`.
3. Confirm the dashboard loads.
4. Log out.
5. Repeat with each seeded role in the test account table.

**Expected Result**

- Valid users can log in.
- Invalid credentials are rejected.
- The application displays role-appropriate navigation.
- Logout returns the user to the login flow.

Screenshot placeholder:

```text
[Screenshot: Authenticated dashboard after login]
```

### Scenario 2: Dashboard

**Objective:** Validate the personal dashboard.

**Steps**

1. Log in as Engineer or QA Engineer.
2. Open Dashboard.
3. Review task summary cards.
4. Review assigned projects.
5. Review upcoming tasks, open risks, and open issues.
6. Select a linked project or task drilldown.

**Expected Result**

- Dashboard data loads without errors.
- Counts and links are visible.
- Drilldowns route to the relevant project, task, risk, or issue view.

Screenshot placeholder:

```text
[Screenshot: User dashboard summary]
```

### Scenario 3: Executive Dashboard

**Objective:** Validate executive and program-level visibility.

**Steps**

1. Log in as Program Manager.
2. Open Executive from the sidebar.
3. Review Total Projects, Green Projects, Amber Projects, Red Projects, Open Risks, Open Issues, and Overdue Tasks.
4. Open a project requiring attention.

**Expected Result**

- Executive metrics are visible to authorized users.
- Drilldowns route to filtered project, risk, issue, or task views.
- Unauthorized users see a permission message if they navigate directly.

Screenshot placeholder:

```text
[Screenshot: Executive dashboard]
```

### Scenario 4: Projects - Create, Edit, Delete

**Objective:** Validate project lifecycle operations.

**Steps**

1. Log in as Project Manager.
2. Open Projects.
3. Create a project with name, description, status, dates, owner, business owner, executive sponsor, and delivery lead.
4. Confirm the project appears in the list.
5. Edit the project and change status or owner fields.
6. Confirm updates are visible.
7. Delete the test project if deletion is available to the role.

**Expected Result**

- Project create, edit, and delete actions complete successfully for authorized users.
- The list refreshes after mutations.
- Unauthorized users do not see unavailable actions.

Screenshot placeholder:

```text
[Screenshot: Projects list and project modal]
```

### Scenario 5: Project Workspace

**Objective:** Validate project-level workspace tabs.

**Steps**

1. Open Projects.
2. Select an existing seeded project.
3. Review Overview and Health.
4. Open Plan.
5. Open Baselines.
6. Open Project Team.
7. Open Risks, Issues, Assumptions, and Dependencies tabs.

**Expected Result**

- Project workspace loads without errors.
- Tabs display project-specific data.
- Counts align with visible data.
- Edit controls appear based on role permissions.

Screenshot placeholder:

```text
[Screenshot: Project workspace tabs]
```

### Scenario 6: Planning Workspace

**Objective:** Validate enterprise planning grid and Gantt interactions.

**Access**

Open the dedicated Planning Workspace URL for a project:

```text
http://<server>:3000/projects/<projectId>/planning
```

**Steps**

1. Open Planning Workspace for a seeded project.
2. Confirm the hierarchy grid and Gantt timeline render.
3. Select a task row.
4. Click Add Task.
5. Confirm the new task appears as the last top-level task and the Task Name cell receives focus.
6. Select a parent task.
7. Click Add Child.
8. Confirm the new child appears as the last child of the selected parent and receives focus.
9. Double-click editable cells such as Task Name, Start, Finish, Duration, % Complete, or Status.
10. Save inline edits with Enter or blur.
11. Drag a schedule bar horizontally.
12. Resize a non-summary schedule bar.
13. Use Zoom Out, Zoom In, Fit to Project, Today, and the Time Scale selector.
14. Create a dependency by selecting predecessor, successor, and dependency type.
15. Delete a dependency.
16. Drag a row within its sibling group to reorder tasks.
17. Confirm WBS numbering updates.
18. Refresh the page.

**Expected Result**

- Planning rows render with correct hierarchy and WBS numbering.
- Add Task appends at the end of the top-level list.
- Add Child appends as the last child.
- Inline edits persist.
- Drag and resize update planning dates.
- Zoom, Today, and Fit to Project update the visible timeline as expected.
- Dependencies can be created and deleted.
- Reordering preserves hierarchy and persists after refresh.

Screenshot placeholders:

```text
[Screenshot: Planning Workspace grid and Gantt]
[Screenshot: Planning toolbar zoom controls]
[Screenshot: Dependency creation panel]
[Screenshot: Row reorder with updated WBS]
```

### Scenario 7: Tasks

**Objective:** Validate task execution workflows.

**Steps**

1. Log in as Engineer or QA Engineer.
2. Open My Tasks.
3. Change task status.
4. Change percent complete.
5. Add or update remarks.
6. Reassign a task where permitted.
7. Save updates.
8. Switch scope to All Visible Tasks if available.
9. Apply status, project, timing, and sort filters.

**Expected Result**

- Assigned task updates save successfully.
- Filtered task lists update based on selected filters.
- Users without edit permission see read-only behavior.

Screenshot placeholder:

```text
[Screenshot: My Tasks with inline operations]
```

### Scenario 8: RAID - Risks

**Objective:** Validate risk management.

**Steps**

1. Open Risks or the RAID page.
2. Create a Risk with project, title, description, owner, probability, impact, mitigation plan, and status.
3. Edit the Risk.
4. Add a comment.
5. Delete the Risk if role permissions allow.

**Expected Result**

- Risk records can be created, edited, commented on, and deleted by authorized users.
- Risk lists refresh after each mutation.

Screenshot placeholder:

```text
[Screenshot: Risk form and risk list]
```

### Scenario 9: RAID - Issues

**Objective:** Validate issue management.

**Steps**

1. Open Issues or the RAID page.
2. Create an Issue with project, title, description, owner, severity or priority fields, resolution plan, and status.
3. Edit the Issue.
4. Add a comment.
5. Delete the Issue if role permissions allow.

**Expected Result**

- Issue records can be created, edited, commented on, and deleted by authorized users.
- Issue filters and drilldowns display expected records.

Screenshot placeholder:

```text
[Screenshot: Issue form and issue list]
```

### Scenario 10: RAID - Assumptions

**Objective:** Validate assumption management.

**Steps**

1. Open RAID.
2. Select or create an Assumption.
3. Enter project, title, description, owner, validation status, validation notes, and status.
4. Edit the Assumption.
5. Add a comment.
6. Delete the Assumption if role permissions allow.

**Expected Result**

- Assumptions can be managed from the RAID page and project workspace RAID tab by authorized users.

Screenshot placeholder:

```text
[Screenshot: Assumption management]
```

### Scenario 11: RAID - Dependencies

**Objective:** Validate RAID dependency records.

**Steps**

1. Open RAID.
2. Create a Dependency record.
3. Enter project, title, description, owner, dependency source, due date, and status.
4. Edit the Dependency.
5. Add a comment.
6. Delete the Dependency if role permissions allow.

**Expected Result**

- RAID dependency records can be created, edited, commented on, and deleted.
- RAID dependencies remain separate from Planning Workspace schedule dependencies.

Screenshot placeholder:

```text
[Screenshot: RAID dependency management]
```

### Scenario 12: Portfolio

**Objective:** Validate portfolio-level summaries and drilldowns.

**Steps**

1. Log in as Program Manager.
2. Open Portfolio.
3. Review total project and health cards.
4. Review open risks by severity.
5. Review open issues by priority.
6. Review overdue tasks.
7. Review upcoming milestones.
8. Review projects requiring attention.
9. Select summary links and confirm filtered destination pages.

**Expected Result**

- Portfolio summary loads successfully.
- Counts and drilldowns are consistent.
- Filtered pages preserve incoming query values.

Screenshot placeholder:

```text
[Screenshot: Portfolio dashboard]
```

### Scenario 13: Users

**Objective:** Validate user administration visibility.

**Steps**

1. Log in as Administrator.
2. Open Users.
3. Review user list, role information, and available actions.
4. Create or update a user if exposed by the current build and permissions.

**Expected Result**

- Users page is visible to accounts with user or role management permissions.
- Password data is not exposed in API responses or UI.
- Role and user actions behave according to available controls.

Screenshot placeholder:

```text
[Screenshot: Users administration]
```

### Scenario 14: Placeholder and Planned Modules

**Objective:** Confirm incomplete modules are clearly bounded.

**Steps**

1. Open Notifications.
2. Attempt to access project-specific Kanban, Timeline, and RAID routes if links or URLs are available.
3. Review Slack and Google Drive areas if exposed.

**Expected Result**

- Notifications displays an empty state.
- Project-specific Kanban redirects to Tasks.
- Project-specific Timeline redirects to Projects.
- Project-specific RAID redirects to RAID.
- Slack and Google Drive workflows are not available in the frontend.

## Known Limitations

| Area | Limitation | Current behavior |
| --- | --- | --- |
| Planning Workspace navigation | Dedicated Planning Workspace is available by project URL. | Use `/projects/<projectId>/planning`; the Project Workspace Plan tab remains a separate task planning surface. |
| Planning engine correctness | Advanced CPM validation and dependency-aware schedule enforcement are planned. | Current planning supports Gantt interaction and dependencies, but deeper scheduling validation is part of future stabilization. |
| Resource Management | Resource capacity and allocation foundations exist, but full resource management is not available. | Resource leveling, capacity planning workflows, and heat-map UI are planned. |
| Critical Path | Critical path indicators exist, but full CPM-grade calculation is planned. | Treat critical path output as Beta for validation. |
| Baselines | Baseline capture and review are available. | Advanced variance reporting and baseline analytics are planned. |
| Kanban | Dedicated project Kanban board is not implemented. | `/projects/<id>/kanban` redirects to `/tasks`. |
| Timeline route | Dedicated project Timeline page is not implemented. | `/projects/<id>/timeline` redirects to `/projects`; use Planning Workspace for the current Gantt view. |
| Notifications | Delivery notification workflow is not implemented. | Notifications page shows an empty state. |
| Slack | Integration workflow is not implemented. | Backend shell exists without usable routes or frontend workflow. |
| Google Drive | Integration workflow is not implemented. | Backend shell exists without usable routes or frontend workflow. |
| Reports | Standalone reporting/export module is not implemented. | Executive and Portfolio dashboards provide the current reporting views. |
| Global search | Search input is visible in the shell. | Full global search behavior is not implemented in this beta. |
| Large schedules | Large-plan optimization is planned. | Validate moderate seeded and customer pilot plans; report performance issues. |

## Feedback Template

Use the following structure for each issue or observation.

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

Screenshot placeholder:

```text
[Screenshot: Defect evidence]
```

## Release Notes

### Completed in This Beta

| Area | Completed work |
| --- | --- |
| Authentication and authorization | JWT login, seeded enterprise roles, permission-aware navigation, protected actions. |
| Dashboards | Personal dashboard, executive dashboard, portfolio summary cards, and drilldowns. |
| Projects | Project list, filtering, health sorting, create, edit, delete, and workspace access. |
| Project Workspace | Overview, health card, plan tab, baselines, team management, and project-scoped RAID tabs. |
| Tasks | Assigned task list, all-visible task scope, filters, status updates, percent complete, remarks, and reassignment. |
| RAID | Risks, assumptions, issues, and dependencies with create, edit, delete, comments, ownership, and project association. |
| Planning Workspace | Inline editing, zoom controls, Add Task, Add Child, row reordering, WBS renumbering, dependency support, drag scheduling, resize scheduling, Today, and Fit to Project. |
| Baselines | Baseline capture and review in the Project Workspace. |
| Portfolio | Project health summaries, open risk/issue summaries, overdue task drilldowns, milestones, and projects requiring attention. |
| Infrastructure | Docker deployment files, Docker Compose configuration, environment example, and development scripts. |
| Testing | Frontend and backend test coverage for major workflows, API clients, role behavior, planning, projects, RAID, and dashboards. |

### Planning Improvements Included

- Inline Editing
- Zoom Controls
- Add Task
- Add Child
- Row Reordering
- WBS Renumbering
- Dependency support
- Drag Scheduling
- Resize Scheduling
- Today marker and scroll
- Fit to Project scaling

### Infrastructure Improvements Included

- Docker deployment support
- Environment configuration via `.env.example`
- Development scripts
- PostgreSQL backend configuration
- Health route and operational startup validation foundations

## Future Roadmap

| Area | Planned direction |
| --- | --- |
| Planning | Stabilize schedule calculations, validation, performance, and enterprise workflow depth. |
| Expand/Collapse WBS | Continue improving hierarchy ergonomics and large-plan navigation. |
| Dependency Editing | Expand schedule dependency editing and validation depth. |
| Toolbar Refresh | Continue refining enterprise planning toolbar layout and affordances. |
| Project Navigation | Improve navigation between Project Workspace, Planning Workspace, tasks, RAID, and reporting surfaces. |
| Portfolio Filtering | Expand portfolio-level filters, segments, and drilldowns. |
| Resource Management | Add resource capacity, allocation, utilization, and leveling workflows. |
| Critical Path | Implement CPM-grade critical path calculations and validation. |
| Milestones | Improve milestone planning, reporting, and dependency behavior. |
| Baselines | Add variance reporting, comparison, and baseline analytics. |
| AI Project Manager | Explore AI-assisted planning, status summarization, risk detection, and delivery recommendations. |

## UAT Completion Checklist

| Area | Pass / Fail | Notes |
| --- | --- | --- |
| Login and logout |  |  |
| Role-based navigation |  |  |
| Dashboard |  |  |
| Executive dashboard |  |  |
| Projects |  |  |
| Project Workspace |  |  |
| Tasks |  |  |
| Planning Workspace |  |  |
| RAID |  |  |
| Portfolio |  |  |
| Users |  |  |
| Placeholder modules clearly bounded |  |  |
| Chrome validation |  |  |
| Edge validation |  |  |
