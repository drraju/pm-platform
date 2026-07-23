# Frontend Architecture

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vitest
- Testing Library

## Structure

```text
frontend/
  app/           Routes and thin page composition
  components/    Shared and domain UI components
  features/      Feature APIs, hooks, types, and business UI
  hooks/         Shared hooks
  lib/api/       Shared API client and API types
  lib/config/    Runtime config
  tests/         Vitest tests
```

## Route Pattern

Pages under `frontend/app` should be thin. They compose feature components and keep business logic inside `frontend/features`.

Example:

```text
frontend/app/(app)/calendar/page.tsx
  -> frontend/features/calendar/components/CalendarList.tsx
```

## Feature Pattern

Feature folders may contain:

```text
features/<feature>/
  api/
  components/
  hooks/
  constants.ts
  index.ts
  types.ts
```

This pattern is used by Enterprise Calendar and is the recommended pattern for future features.

## API Client

All frontend API calls should use `frontend/lib/api/client.ts`. Do not create parallel fetch wrappers. Feature APIs should wrap `apiRequest` and expose feature-specific functions.

## State Management

The current frontend uses React state, effects, and feature hooks. There is no Redux, Zustand, or MobX. Do not introduce global state libraries without an approved architecture decision.

## Shared UI

Existing reusable UI includes:

- `AppShell`
- `PageHeader`
- `AppModal`
- `ModalForm`
- Project/task/RAID/planning components

New UI should match existing Tailwind styling, spacing, badges, buttons, dialogs, and tables.

## Navigation

Navigation is permission-aware in `components/layout/app-shell.tsx`. It reads permissions from auth feature helpers and filters links by permission keys.

## Testing

Frontend tests live under `frontend/tests`. Tests mock feature APIs and Next navigation where needed. Calendar UI tests cover page rendering, list loading, dialogs, nested CRUD editors, and navigation.

# Frontend Architecture

## Purpose

Define the frontend architecture for the Next.js application, including routing, component structure, feature organization, API usage, accessibility, and performance expectations.

## Scope

This document covers frontend code under `frontend/`, including app routes, feature modules, shared components, API client patterns, styles, and frontend tests.

## Audience

Frontend engineers, UX designers, QA engineers, accessibility reviewers, and technical product managers.

## Overview

The frontend is a Next.js and React application with feature-scoped modules, reusable components, Tailwind CSS styling, and a shared API client. Enterprise workflows should prioritize dense, readable operational interfaces over marketing-style layouts.

## Contents

### Frontend Structure

```text
frontend/
|-- app/                     Next.js routes and layouts
|-- components/              Shared UI and domain components
|-- features/                Feature-level exports and API wrappers
|-- lib/                     API client and configuration
|-- styles/                  Global styles
|-- tests/                   Vitest and Testing Library tests
`-- types/                   Shared TypeScript types
```

### Component Layers

```text
Page route
  -> Feature container
  -> Domain component
  -> Shared UI component
  -> API client
```

### UI Principles

- Optimize for repeated enterprise workflows.
- Keep navigation predictable.
- Use accessible labels, focus states, and keyboard alternatives.
- Avoid oversized decorative surfaces in operational screens.
- Use responsive constraints so tables, grids, and Gantt views remain usable.

### Planning Workspace UI

The Planning Workspace combines:

- Project planning header.
- Hierarchical task tree.
- Gantt timeline.
- Dependency panel.
- Critical path visual indicators.
- Resource allocation overlay.

The long-term direction should include row virtualization, keyboard schedule editing, and lazy-loaded schedule projections for large project plans.

### API Client

The API client in `frontend/lib/api/client.ts` centralizes JSON requests, authentication headers, error parsing, and typed response shapes. Feature modules should re-export relevant API functions rather than duplicating request logic.

### Testing

Frontend tests should cover:

- Page rendering.
- Component interactions.
- Form validation and API error states.
- Authorization-driven visibility.
- Accessibility and keyboard behavior.
- Large-data performance for planning surfaces.

## Related Documents

- [System Architecture](system-architecture.md)
- [Backend Architecture](backend.md)
- [Planning Workspace User Guide](../user-guide/planning-workspace.md)
- [Testing Strategy](../development/testing.md)

## Revision History

| Date | Version | Author | Notes |
| --- | --- | --- | --- |
| 2026-06-25 | 0.1 | Codex | Created frontend architecture framework. |
