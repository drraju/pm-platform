# Role Visibility Matrix

Last updated: 2026-07-26

## Project Visibility

| Role | Project List Visibility | Project Detail Visibility |
| --- | --- | --- |
| `PLATFORM_ADMIN` | All projects | All projects |
| `PORTFOLIO_MANAGER` | All projects | All projects |
| `PROJECT_MANAGER` | Projects owned by the user, projects where the user is a manager/member, and projects containing tasks assigned to the user | Same visible project set |
| `TEAM_MEMBER` | Projects where the user is a member and projects containing tasks assigned to the user | Same visible project set |
| `EXECUTIVE` | All projects, read-only by permissions | All projects, read-only by permissions |
| `CUSTOMER` | Projects where the user is a member or explicitly assigned at project level | Same visible project set |
| `PARTNER` | Projects where the user is a member or explicitly assigned at project level | Same visible project set |

## Project Detail Data

Once a user can access a project, project workspace APIs return the full project
workspace context for that project:

- Project tasks
- Project team
- Project RAID items
- Project assumptions
- Project dependencies
- Project milestones where exposed by workspace APIs

## My Tasks

`GET /tasks/my` is always assigned-user scoped:

- Returns only tasks where `assigneeId` is the authenticated user.
- Does not expand based on project membership.
- Does not return tasks assigned to other project members.

## Shared Visibility Service

Backend visibility is centralized in:

- `backend/src/modules/projects/project-visibility.service.ts`

Shared methods:

- `getVisibleProjects(actor)`
- `getVisibleProjectIds(actor)`
- `canViewProject(projectId, actor)`

APIs expected to use the shared project visibility rules:

- `GET /projects`
- `GET /projects/:id`
- `GET /projects/:id/members`
- `GET /projects/:projectId/tasks`
- `GET /projects/:id/risks`
- `GET /projects/:id/issues`
- `GET /projects/:id/assumptions`
- `GET /projects/:id/dependencies`
- `GET /dashboard/me`
- `GET /portfolio/summary`
- `GET /tasks`
- `GET /tasks/:id`
