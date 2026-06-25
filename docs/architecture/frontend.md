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
