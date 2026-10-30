# Startup readiness audit

**Date:** 29 Oct 2026. **Environment:** Docker on this machine. Frontend `http://localhost:3000`, API `http://localhost:3001`. Postgres and Redis healthy. **Code:** not modified during the audit.

## Verdict

A startup cannot run the week from this product yet. The planning grid and the Today grid are real. The loop around them is not: the same project reports two overdue counts, Slack and notifications are empty classes behind visible controls, and a platform admin lands on an executive scorecard.

Customer Success can reuse the shell. It cannot reuse the current `CUSTOMER` role.

## What was exercised

Signed in as the seeded platform admin (`admin@example.com`) on `http://localhost:3000`. The only project was CapGemini. The same login on `http://127.0.0.1:3000` showed **Failed to fetch**. A preflight to `/auth/login` returns `Access-Control-Allow-Origin: http://localhost:3000` even when the browser origin is `http://127.0.0.1:3000`.

The seeded admin account accepted the development fallback password. That is acceptable only for a local seed. It is not an authentication design.

## One project, two truths

Observed on 29 Oct 2026:

| Surface | What it said |
| --- | --- |
| Executive, opened by default, nav label Dashboard | 1 project, Red, **3 of 5 tasks overdue (60%)**, 0 open risks, 0 open issues |
| Project overview | Overdue **4**, work items 5, in progress 2, completed 0. Finish 30 Nov 2026. Next milestone, release, and go-live: not scheduled |
| Today | All active **5**, overdue **4**, due today 0, blocked 0 |
| Dated rows | Overdue: Read API 13 Oct, Test2 11 Oct, Fabrix Pipeline 20 Oct, Test Dashboard 27 Oct. `test` is due 30 Oct and is not overdue |
| Fabrix Pipeline | Status In Progress, progress 21%. Today's update: "Kanban status changed to Done." |
| Planning | No forecast, no baseline, no dependencies, 0 milestones. Footer: 6 tasks and 3 summary tasks. Today marks only Integration as Summary |

The task omitted from the executive "3 of 5" was not isolated in code. The disagreement is already enough to make a stand-up unsafe.

## Shell

The admin sidebar showed Home, Portfolio, Projects, Today, Daily Review, a disabled Planning row, a disabled Resources row, and Dashboard (the executive page). Administration appeared twice: once above AI Playground, again above Enterprise Calendars and User Administration. The header search opens a command palette ("Search commands and workspaces"). AI Assistant is a disabled button whose title says it is a placeholder. Notifications is a static page: "Delivery alerts and workflow updates will appear here" and "No notifications yet."

`SlackService` and `SlackController` have no operations. `NotificationsService` is empty. `/projects/:id/kanban` redirects to `/tasks`. `/projects/:id/timeline` redirects to `/projects`.

People render as "member Project" and the session badge as the raw role `PLATFORM_ADMIN`.

## Access model that is actually in the code

Global roles today are single-track canonical values: Platform Admin, Portfolio Manager, Project Manager, Team Member, Executive, Customer, Partner. The seed grants `CUSTOMER` and `PARTNER` `raid.read`. The visibility notes say a person who can open a project receives that project's tasks, team, and RAID. The partner/customer spec says external people must not see internal risks and issues. `capabilities.ts` then special-cases the role name `CUSTOMER` and turns project workspaces off. The security doc says not to branch on role names.

There is no Customer Success menu, no Sales role, and no first-class customer record driving the project.

## Tests

Host `node_modules` folders were empty. The production images contain a Jest binary and not the spec sources, so the suite was run on the host after `npm ci`. Lockfiles were not changed.

| Suite | Result |
| --- | --- |
| Frontend Vitest | 625 passed, 62 files, about 10s |
| Backend Jest | 1,504 passed, 3 failed, 4 todo, 181 suites, about 8s |

The three failures are the AI provider registry. The tests still expect only the mock provider. The registry also registers OpenAI. The passing tests do not cover the live 3-versus-4 overdue split, because that split is across screens.

## Scores

Auditor judgment of daily usefulness, 0 absent to 5 ready for a startup week. The bar for daily use is 4.

| Capability | Score | Why |
| --- | --- | --- |
| Planning schedule | 3 | A working grid and Gantt exist. The live project has no forecast, baseline, dependencies, or milestones |
| Today grid | 3 | Owner, status, due date, update, and next step are the right columns. The numbers disagree with Executive |
| One status | 1 | Two overdue counts, a free percent, and a comment that contradicts the status |
| Notifications | 0 | Empty service and a static page |
| Slack | 0 | Empty service and controller |
| Work search | 1 | Search is commands, plus local filters inside a few screens |
| Customer data wall | 1 | An external role exists and is contradicted by `raid.read` |
| Customer Success | 0 | No account object, no menu, no health |

## What is worth keeping

- Permission keys on `/auth/me`, and a sidebar that filters by those keys.
- A project workspace with a stable set of tabs.
- Today as the place a person updates work.
- A plan view of the same tasks.
- Google sign-in already present on the login screen, next to email and password.
- The test suite, once the three registry tests match the providers that actually register.

## What the next docs specify

The repair is not another dashboard. It is one status, one customer table, one project, many roles on one person, and a sidebar that only lists rooms that work. The sequence is the milestone list.
