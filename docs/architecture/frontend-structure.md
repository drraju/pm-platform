# Frontend Structure

## Overview

The frontend is a Next.js App Router application in `frontend/`. It uses route groups for authenticated application pages and auth pages, shared layout components, feature exports, and a centralized API client.

## App Router Structure

Current route structure:

```text
frontend/app/
  layout.tsx
  page.tsx
  (auth)/
    login/page.tsx
  (app)/
    layout.tsx
    dashboard/page.tsx
    portfolio/page.tsx
    projects/page.tsx
    projects/[id]/page.tsx
    tasks/page.tsx
    risks/page.tsx
    issues/page.tsx
    raid/page.tsx
    users/page.tsx
    notifications/page.tsx
  (dashboard)/
    executive/page.tsx
    user/page.tsx
  projects/[id]/
    kanban/page.tsx
    raid/page.tsx
    timeline/page.tsx
```

The authenticated route group `frontend/app/(app)` uses the application shell and contains the main operating experience. Additional project subroutes for Kanban, RAID, and Timeline exist outside the `(app)` group and are reserved for planned implementations.

## Components

Reusable UI components live under `frontend/components`.

```text
frontend/components/
  dashboard/
    dashboard-section.tsx
    stat-card.tsx
    summary-card.tsx
  layout/
    app-shell.tsx
    page-header.tsx
  projects/
    project-health-badge.tsx
    project-health-card.tsx
    project-table.tsx
    project-workspace-overview.tsx
    project-workspace-register-section.tsx
    project-workspace-summary.tsx
    project-workspace-table.tsx
    project-workspace-tasks.tsx
    project-workspace-team.tsx
  tasks/
    task-table.tsx
```

Key component responsibilities:

- `AppShell`: sidebar navigation, responsive mobile drawer, header, logout, and global search input.
- `PageHeader`: standard page heading and description.
- `SummaryCard`: reusable metric card used by dashboard, portfolio, and project workspace.
- `DashboardSection`: reusable list section with empty state.
- `ProjectHealthBadge`: shared health badge for project, dashboard, and portfolio views.
- `ProjectTable`: responsive project list table.
- `ProjectWorkspace*`: reusable sections and tables for project detail pages.
- `TaskTable`: reusable task table for the My Tasks page.

## Features

Feature folders provide stable imports for API functions and domain types:

```text
frontend/features/
  auth/index.ts
  dashboard/index.ts
  portfolio/index.ts
  projects/index.ts
  raid/index.ts
  tasks/index.ts
  users/index.ts
  notifications/index.ts
  integrations/
    google-drive/index.ts
    slack/index.ts
```

Most feature modules re-export API client functions from `frontend/lib/api/client.ts`. This keeps page code oriented around the feature domain rather than direct client internals.

## API Client

The API client is centralized in `frontend/lib/api/client.ts`.

Responsibilities:

- Build requests relative to `NEXT_PUBLIC_API_URL` or `http://localhost:3001`.
- Read access tokens from `localStorage`.
- Attach `Authorization: Bearer <token>` when present.
- Normalize error responses into thrown `Error` instances.
- Export API response types used by pages and components.

Example API groups:

- Auth: `login`, `register`, session storage helpers.
- Dashboard: `getMyDashboard`.
- Portfolio: `getPortfolioSummary`.
- Projects: project CRUD, members, tasks, project RAID collections.
- Tasks: `getMyTasks`, task CRUD.
- RAID: `getRaidItems`, `createRaidItem`.
- Users: users and roles.

## Layouts

`frontend/app/(app)/layout.tsx` wraps authenticated pages in `AppShell`.

The shell provides:

- Sidebar navigation: Dashboard, Portfolio, Projects, My Tasks, Risks, Issues, Notifications.
- Active route highlighting.
- Collapsible desktop sidebar.
- Mobile drawer navigation.
- Header with global search input, user profile area, and logout.

## Dashboard

Route: `/dashboard`

Data source:

- `GET /dashboard/me`

Displayed sections:

- Task summary cards.
- Delivery health.
- Assigned projects.
- Upcoming tasks.
- Open risks.
- Open issues.

The dashboard uses `SummaryCard`, `DashboardSection`, and `ProjectHealthBadge`.

## Portfolio

Route: `/portfolio`

Data source:

- `GET /portfolio/summary`

Displayed sections:

- Total Projects.
- Green Projects.
- Amber Projects.
- Red Projects.
- Open Risks by Severity.
- Open Issues by Priority.
- Overdue Tasks.
- Projects Requiring Attention.

The portfolio page reuses the existing portfolio API call for all widgets. Project names in portfolio widgets link to `/projects/[id]`.

## Project Workspace

Route: `/projects/[id]`

Data source:

- `GET /projects/:id`

Displayed sections:

- Project overview.
- Project health.
- Summary metrics.
- Team members.
- Tasks.
- Risks.
- Issues.
- Assumptions.
- Dependencies.

The project workspace uses reusable components for overview, team, tasks, summary cards, health card, and RAID-style tables.

## Test Structure

Frontend tests live in `frontend/tests`.

Examples:

- `portfolio-page.test.tsx`: portfolio widgets, empty state, and error state.
- `project-workspace.test.tsx`: workspace sections and reusable table behavior.
- `projects-page-navigation.test.tsx`: list-to-workspace navigation.
- `project-api-client.test.ts`: API client request and response behavior.
- `navigation.test.tsx`: application shell navigation.
