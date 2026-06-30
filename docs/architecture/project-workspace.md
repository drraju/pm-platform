# Project Workspace Architecture

## Purpose

The Project Workspace is the project-level operating cockpit. It gives delivery teams, managers, and executives a consistent place to understand context, plan work, manage execution, govern RAID, review teams, and prepare reports.

## Page Hierarchy

```text
Project Workspace
  |
  |-- Project Header
  |-- Project Tabs
  |-- Overview
  |-- Planning
  |-- Tasks
  |-- RAID
  |-- Team
  |-- Documents
  |-- Reports
  |-- Settings (planned)
```

## Project Navigation

Project navigation should preserve project context across all modules. The selected project ID, project name, health, ownership, and user permissions are workspace-level context and should not be rediscovered independently by each tab.

```text
Projects List -> Project Workspace -> Module Tab -> Module Action
```

## Project Header

The header displays project identity and decision context:

- Project name and description.
- Status and health.
- Owner, business owner, sponsor, delivery lead.
- Key dates and portfolio alignment.
- High-level actions allowed by permissions.

The header remains consistent across tabs so users always know which project they are operating in.

## Project Context

Project context includes:

| Context | Owner |
| --- | --- |
| Project metadata | Projects module |
| Team membership | Projects/Team module |
| Permissions | Authorization module |
| WBS and schedule | Planning module |
| RAID counts | RAID module |
| Reports | Reporting module |

## Overview

Overview provides a read-only project summary. It must show the same WBS hierarchy used by Planning and Tasks, even when editing controls are omitted. Overview should not flatten summary tasks, phases, subtasks, or milestones.

## Planning

Planning is the scheduling workspace. It owns WBS editing, Gantt rendering, dependencies, scheduling metadata, and future critical path/baseline/calendar interactions. See [Planning Engine v2](./planning-engine-v2.md).

## Tasks

Tasks is the execution workspace. It supports inline updates to assigned work, status, progress, priority, comments, and dates where the task type permits manual editing. Summary rows are calculated and should be read-only for execution fields.

## RAID

RAID captures project governance items:

- Risks
- Assumptions
- Issues
- Dependencies

Owners should come from the project team. RAID records can roll up to portfolio reporting.

## Team

Team manages project membership and project roles. It does not duplicate global user management. It supplies assignable people to Planning, Tasks, and RAID.

## Documents

Documents provide project artifacts and future integration surfaces for Google Drive and other repositories. Documents are project-scoped and permission-aware.

## Reports

Reports consume project data from Planning, Tasks, RAID, Team, and Baselines. Reports should not own business calculations that belong to source modules.

## Settings

Settings is planned for project-level configuration such as calendars, scheduling defaults, report preferences, and integration settings.

## Reusable Components

| Component | Use |
| --- | --- |
| ProjectHeader | Project identity and status context |
| ProjectTabs | Consistent module navigation |
| ProjectWorkspaceOverview | Read-only summary |
| PlanningWorkspace | WBS and Gantt execution |
| ProjectWorkspaceTasks | Task execution table |
| ProjectWorkspaceTeam | Team roster and roles |
| ProjectWorkspaceRegisterSection | RAID display |

## Permissions

Permissions are enforced on the backend. The frontend uses permissions to hide disabled workflows, reduce confusion, and prevent unnecessary failed requests.

| Permission Area | Examples |
| --- | --- |
| Project update | Edit project metadata, settings |
| Task create/update/delete | Manage WBS and execution items |
| Task reassign | Change assignees |
| RAID manage | Create and update RAID records |
| Team manage | Add/remove members and change project roles |

## Future Modules

- Customer Success view.
- Financials and budget tracking.
- Resource and workload planning.
- Change requests.
- AI project manager briefing panel.
