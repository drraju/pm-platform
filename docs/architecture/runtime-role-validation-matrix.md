# Runtime Role Validation Matrix

Date: 2026-06-20

## Scope

This matrix records v1.0.5.5 and v1.0.5.6 runtime validation for:

- Navigation visibility
- Project visibility
- Task visibility
- RAID visibility
- Portfolio visibility
- Executive visibility
- Allowed and forbidden actions

Validation used the rebuilt Docker stack and seeded users where credentials were available. The 2026-06-20 update also revalidated frontend dashboard landing and drilldown URL behavior through the automated frontend regression suite.

## Role Visibility Matrix

| Role | Navigation | Projects | Tasks | RAID | Portfolio | Executive | Actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SUPER_ADMIN` | Full admin navigation | All projects | All tasks through management permissions | All RAID | Full | Full | Full management |
| `Admin` | Full admin navigation expected | All projects expected | All tasks expected | All RAID expected | Full expected | Full expected | Full management expected |
| `Program Manager` | Dashboard, Executive, Projects, Portfolio, Risks, Issues, Tasks, Notifications | All projects | Full task management | All RAID | Full | Full | Project/task/team management |
| `Portfolio Manager` | Dashboard, Executive, Projects, Portfolio, Risks, Issues, Tasks | All projects | Full task management | All RAID | Full | Full | Project/task/team management; `/dashboard` resolves to `/portfolio` |
| `Project Manager` | Dashboard, Projects, Risks, Issues, Tasks, Notifications | Owned/member/task-assigned projects | Full task management on visible projects | Visible project RAID | Not currently permissioned | Not currently permissioned | Project/task/team management |
| `Delivery Lead` | Dashboard, Projects, Risks, Issues, Tasks, Notifications | Owned/member/task-assigned projects | Full task management on visible projects | Visible project RAID | Not currently permissioned | Not currently permissioned | Task/team management on visible projects |
| `Team Member` | Dashboard, Projects, Risks, Issues, Tasks, Notifications | Member/task-assigned projects | Assigned-task update workflows | Visible project RAID | Not currently permissioned | Not currently permissioned | Own task updates/reassign per task rules |
| `Partner` | Dashboard, Projects, Tasks, Risks, Issues, Notifications | Assigned/member projects only | Assigned-task update workflows | Assigned/member project RAID only | Not currently permissioned | Not currently permissioned | Limited task update/comment/reassign permissions |
| `Customer` | Dashboard, Projects, Risks, Issues, Notifications | Assigned/member projects only | Read-only task visibility | Assigned/member project RAID only | Not currently permissioned | Not currently permissioned | Read-only |
| `Executive` | Dashboard, Executive, Portfolio, Projects, Risks, Issues, Notifications | All projects | Read-only task visibility | All RAID, read-only | Full | Full | Read-only; `/dashboard` resolves to `/executive` |

## Runtime API Evidence

| Role | Login User | Projects Returned | RAID Returned | Portfolio Summary | Dashboard |
| --- | --- | ---: | ---: | ---: | ---: |
| `SUPER_ADMIN` | `admin@example.com` | 3 | 25 | 3 projects | 3 assigned projects |
| `Admin` | `platform.admin@example.com` | Not validated | Not validated | Not validated | Not validated |
| `Program Manager` | `program.manager@example.com` | 3 | 25 | 3 projects | 3 assigned projects |
| `Portfolio Manager` | `portfolio.manager@example.com` | 3 | 25 | 3 projects | `/portfolio` default landing |
| `Project Manager` | `project.manager@example.com` | 3 | 25 | 3 projects | 3 assigned projects |
| `Delivery Lead` | `delivery.lead@example.com` | 3 | 25 | 3 projects | 3 assigned projects |
| `Team Member` | `engineer@example.com` | 3 | 25 | 3 projects | 3 assigned projects |
| `Partner` | `partner@example.com` | 1 | 10 | 1 project | 1 assigned project |
| `Customer` | `customer@example.com` | 1 | 10 | 1 project | 1 assigned project |
| `Executive` | `executive@example.com` | 3 | 25 | 3 projects | `/executive` default landing |

Admin note: `platform.admin@example.com` exists with full permissions in the database, but login using the documented default seed password returned `401`.

## Permission Matrix Highlights

| Role | Project Mutate | Task Mutate | Team Manage | RAID Mutate | User/Role Admin | Executive View |
| --- | --- | --- | --- | --- | --- | --- |
| `SUPER_ADMIN` | Yes | Yes | Yes | Yes | Yes | Yes |
| `Admin` | Yes | Yes | Yes | Yes | Yes | Yes |
| `Program Manager` | Yes | Yes | Yes | Create/update | No | Yes |
| `Portfolio Manager` | Yes | Yes | Yes | Create/update | No | Yes |
| `Project Manager` | Yes | Yes | Yes | Create/update/delete | No | No |
| `Delivery Lead` | Update visible projects | Yes | Yes | Create/update | No | No |
| `Team Member` | No | Own task update/comment/reassign | No | Create/update-own | No | No |
| `Partner` | No | Own task update/comment/reassign | No | No | No | No |
| `Customer` | No | Read-only | No | No | No | No |
| `Executive` | No | Read-only | No | No | No | Yes |

## Dashboard Landing And Drilldown Contracts

| Role | Route Opened | Expected Landing | Filter Contract |
| --- | --- | --- | --- |
| `Executive` | `/dashboard` | `/executive` | Executive cards drill into global visible datasets |
| `Portfolio Manager` | `/dashboard` | `/portfolio` | Portfolio cards drill into global visible datasets |
| `Program Manager` | `/dashboard` | `/dashboard` | Personal dashboard filters stay user-scoped |
| `Project Manager` | `/dashboard` | `/dashboard` | Personal dashboard filters stay user-scoped |
| `Delivery Lead` | `/dashboard` | `/dashboard` | Personal dashboard filters stay user-scoped |
| `Team Member` | `/dashboard` | `/dashboard` | Personal dashboard filters stay user-scoped |

| Executive Widget | Destination | Expected Result |
| --- | --- | --- |
| Green Projects | `/projects?health=GREEN&sort=health_asc` | Project list count equals green widget count |
| Amber Projects | `/projects?health=AMBER&sort=health_desc` | Project list count equals amber widget count |
| Red Projects | `/projects?health=RED&sort=health_desc` | Project list count equals red widget count |
| Open Risks | `/risks?status=open` | Risk register excludes closed/resolved items |
| Open Issues | `/issues?status=open` | Issue register excludes closed/resolved items |
| Overdue Tasks | `/tasks?scope=all&timing=overdue` | Task list uses the same overdue date-only rule as portfolio/executive counts |

## Navigation Matrix

| Role | Dashboard | Executive | Portfolio | Projects | My Tasks | Risks | Issues | Users | Notifications |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SUPER_ADMIN` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `Admin` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `Program Manager` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes |
| `Portfolio Manager` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | No |
| `Project Manager` | Yes | No | No | Yes | Yes | Yes | Yes | No | Yes |
| `Delivery Lead` | Yes | No | No | Yes | Yes | Yes | Yes | No | Yes |
| `Team Member` | Yes | No | No | Yes | Yes | Yes | Yes | No | Yes |
| `Partner` | Yes | No | No | Yes | Yes | Yes | Yes | No | Yes |
| `Customer` | Yes | No | No | Yes | No | Yes | Yes | No | Yes |
| `Executive` | Yes | Yes | Yes | Yes | No | Yes | Yes | No | Yes |

## Validation Limitations

- Screenshots were not captured because the in-app Browser was unavailable.
- The final container restart after the last backend DI fix was blocked by the approval system usage limit. Backend tests, backend build, and final backend Docker image build passed after the fix.
- Admin runtime login was not validated because the known seed password failed.
- Dashboard landing and drilldown validation was automated at the frontend test layer rather than browser-recorded manually in this environment.

## Recommended v1.0.6 Follow-Up

- Add e2e API tests for Customer, Partner, Team Member, and Executive RAID visibility.
- Add a seeded Admin credential validation test.
- Add browser smoke tests for Executive navigation, role-based default landing, and read-only controls.


