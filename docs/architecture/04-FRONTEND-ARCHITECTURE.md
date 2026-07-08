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

