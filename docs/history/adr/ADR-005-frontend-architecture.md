# ADR-005: Frontend Architecture

## Status

Accepted.

## Context

The frontend uses Next.js App Router, React, Tailwind CSS, a shared API client, shared layout/modal components, and Vitest. Feature code is organized under `frontend/features`.

## Decision

Frontend features should follow the existing feature-based architecture:

- `app/` contains routes and thin page composition.
- `features/<feature>/api` wraps shared API calls.
- `features/<feature>/hooks` owns feature state.
- `features/<feature>/components` owns feature UI.
- `components/` contains shared reusable UI.
- `lib/api/client.ts` remains the shared fetch utility.

No Material UI, Ant Design, Chakra, Bootstrap, Redux, Zustand, or MobX should be introduced without a future ADR.

## Consequences

- Feature UIs remain cohesive.
- Pages stay small and route-oriented.
- API calls are consistent and easy to mock.
- Styling remains consistent with the existing app.

## Alternatives Considered

| Alternative | Reason Rejected |
| --- | --- |
| Per-page business logic | Makes route files too large and hard to reuse. |
| New UI framework | Would fragment visual language and dependency surface. |
| Global client state library | Current requirements are met with hooks and local state. |

## Future Implications

Resource Management, Gantt, Capacity Planning, and AI screens should follow this structure and test pattern.

